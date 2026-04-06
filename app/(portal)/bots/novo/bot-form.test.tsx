import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { BotForm } from './bot-form';
import { api } from '@/lib/api';
import { mockResponse } from '@/tests/helpers/mocks';

// Radix UI Switch uses ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const baseInitialData = {
  restaurant_name: 'Pizzaria Teste',
  cep: '01001000',
  address: 'Rua Teste, 123',
  max_delivery_radius: 10,
  is_open: true,
};

describe('BotForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders basic form fields', () => {
    renderWithProviders(
      <BotForm onSubmit={vi.fn()} isPending={false} initialData={baseInitialData} />
    );

    expect(screen.getByLabelText(/nome do restaurante/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/taxa de entrega/i)).toBeInTheDocument();
  });

  it('does not show WhatsApp picture button when bot has no WhatsApp connection', () => {
    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: undefined,
          restaurant_image_url: 'https://example.com/image.jpg',
        }}
      />
    );

    expect(screen.queryByText(/usar como foto do whatsapp/i)).not.toBeInTheDocument();
  });

  it('does not show WhatsApp picture button when bot has empty phone_number_id', () => {
    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: '   ',
          restaurant_image_url: 'https://example.com/image.jpg',
        }}
      />
    );

    expect(screen.queryByText(/usar como foto do whatsapp/i)).not.toBeInTheDocument();
  });

  it('does not show WhatsApp picture button when no image exists', () => {
    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: 'phone_123',
          restaurant_image_url: null,
        }}
      />
    );

    expect(screen.queryByText(/usar como foto do whatsapp/i)).not.toBeInTheDocument();
  });

  it('shows WhatsApp picture button when bot is connected and has an existing image', () => {
    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: 'phone_123',
          restaurant_image_url: 'https://example.com/image.jpg',
        }}
      />
    );

    expect(screen.getByText(/usar como foto do whatsapp/i)).toBeInTheDocument();
  });

  it('shows WhatsApp picture button after user uploads a new image on connected bot', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: 'phone_123',
          restaurant_image_url: null,
        }}
      />
    );

    // Initially no button (no image)
    expect(screen.queryByText(/usar como foto do whatsapp/i)).not.toBeInTheDocument();

    // Upload an image
    const file = new File(['fake-image'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    // Now the button should appear
    expect(screen.getByText(/usar como foto do whatsapp/i)).toBeInTheDocument();
  });

  it('calls PUT endpoint with the uploaded file when WhatsApp picture button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(api.put).mockResolvedValueOnce(mockResponse({ status: 'updated', bot_id: 1 }));

    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: 'phone_123',
          restaurant_image_url: null,
        }}
      />
    );

    // Upload an image first
    const file = new File(['fake-image'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    // Click the WhatsApp button
    const whatsappBtn = screen.getByText(/usar como foto do whatsapp/i);
    await user.click(whatsappBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/bots/1/whatsapp-profile-picture',
        expect.any(FormData)
      );
    });

    // Verify success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Foto atualizada!' })
      );
    });
  });

  it('shows error toast when WhatsApp picture upload fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.put).mockRejectedValueOnce({
      response: { status: 502, data: { detail: 'Falha ao atualizar foto de perfil.' } },
    });

    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: 'phone_123',
          restaurant_image_url: null,
        }}
      />
    );

    // Upload an image
    const file = new File(['fake-image'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    // Click the WhatsApp button
    const whatsappBtn = screen.getByText(/usar como foto do whatsapp/i);
    await user.click(whatsappBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao atualizar foto',
          variant: 'destructive',
        })
      );
    });
  });

  it('fetches image from URL when no local file is available', async () => {
    const user = userEvent.setup();
    vi.mocked(api.put).mockResolvedValueOnce(mockResponse({ status: 'updated', bot_id: 1 }));

    const fakeBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      blob: () => Promise.resolve(fakeBlob),
    } as Response);

    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: 'phone_123',
          restaurant_image_url: 'https://example.com/image.jpg',
        }}
      />
    );

    const whatsappBtn = screen.getByText(/usar como foto do whatsapp/i);
    await user.click(whatsappBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('https://example.com/image.jpg');
    });

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/bots/1/whatsapp-profile-picture',
        expect.any(FormData)
      );
    });

    fetchSpy.mockRestore();
  });

  it('shows error toast when fetching image from URL fails', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(
      <BotForm
        onSubmit={vi.fn()}
        isPending={false}
        initialData={{
          ...baseInitialData,
          id: 1,
          phone_number_id: 'phone_123',
          restaurant_image_url: 'https://example.com/image.jpg',
        }}
      />
    );

    const whatsappBtn = screen.getByText(/usar como foto do whatsapp/i);
    await user.click(whatsappBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro',
          description: 'Não foi possível carregar a imagem. Tente novamente.',
          variant: 'destructive',
        })
      );
    });

    fetchSpy.mockRestore();
  });

  it('does not show WhatsApp button on create form (no initialData)', () => {
    renderWithProviders(
      <BotForm onSubmit={vi.fn()} isPending={false} />
    );

    expect(screen.queryByText(/usar como foto do whatsapp/i)).not.toBeInTheDocument();
  });

  it('calls onSubmit with form values when the form is submitted', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <BotForm onSubmit={onSubmit} isPending={false} initialData={baseInitialData} />
    );

    const submitBtn = screen.getByText(/salvar configurações/i);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
