/**
 * Widget integration tests (plan/in_browser_bots.md §3.1 + §7.1).
 *
 * Covers the full mount → render → interact flow with the existing
 * EventSource + fetch mocks in tests/setup.tsx. Pins:
 *
 *   1. Welcome bubble appears after /session handshake.
 *   2. SSE 'message' events render as bot bubbles.
 *   3. Submitting the form posts to /chat/{botId}/message and renders
 *      a user bubble optimistically.
 *   4. SSE 'typing' events toggle the typing indicator.
 *   5. SSE 'payment_qr' events render the PIX QR with copy/open links.
 *   6. Free-tier handshake shows the "Powered by ZenBotZ®" footer; Pro
 *      tier hides it.
 *   7. /session failure with web_widget_disabled detail surfaces the
 *      inline error banner (no chat input shown).
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../helpers/render";
import { ZenBotsWidget } from "@/components/widget/ZenBotsWidget";

// ── Helpers ──────────────────────────────────────────────────────────

interface MockEventSourceLike {
  url: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
  simulateMessage(data: unknown): void;
  simulateOpen(): void;
  simulateError(): void;
}

let lastEventSource: MockEventSourceLike | null = null;

function trackEventSource() {
  lastEventSource = null;
  const original = (globalThis as unknown as { EventSource: new (url: string) => MockEventSourceLike }).EventSource;
  (globalThis as unknown as { EventSource: unknown }).EventSource = function (url: string) {
    const instance = new original(url);
    lastEventSource = instance;
    return instance;
  } as unknown as typeof EventSource;
  return original;
}

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  const fetchMock = vi.fn().mockImplementation(() => {
    const next = responses.shift();
    if (!next) {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
    }
    return Promise.resolve({
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: () => Promise.resolve(next.body),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("ZenBotsWidget", () => {
  let originalEventSource: unknown;

  beforeEach(() => {
    originalEventSource = trackEventSource();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (globalThis as unknown as { EventSource: unknown }).EventSource =
      originalEventSource;
  });

  it("renders the welcome message after a successful /session handshake", async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          session_id: "fresh-uuid",
          bot_display_name: "Sabor da Serra",
          welcome_message: "Olá! Bem-vindo(a) ao Sabor da Serra!",
          theme: {},
          plan_tier: "pro_monthly",
        },
      },
    ]);

    renderWithProviders(<ZenBotsWidget botId={42} />);

    expect(
      await screen.findByText("Olá! Bem-vindo(a) ao Sabor da Serra!"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sabor da Serra")).toBeInTheDocument();
  });

  it("appends bot bubbles from SSE 'message' events", async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          session_id: "s",
          bot_display_name: "Pizzaria",
          welcome_message: "Olá!",
          theme: {},
          plan_tier: "free",
        },
      },
    ]);

    renderWithProviders(<ZenBotsWidget botId={1} />);
    await screen.findByText("Olá!");

    expect(lastEventSource).not.toBeNull();
    lastEventSource!.simulateMessage({
      type: "message",
      payload: {
        text: "Temos pizza de calabresa hoje!",
        attachments: [],
      },
    });

    expect(
      await screen.findByText("Temos pizza de calabresa hoje!"),
    ).toBeInTheDocument();
  });

  it("toggles the typing indicator on SSE 'typing' events", async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          session_id: "s",
          bot_display_name: "Pizzaria",
          welcome_message: "Olá!",
          theme: {},
          plan_tier: "free",
        },
      },
    ]);
    renderWithProviders(<ZenBotsWidget botId={1} />);
    await screen.findByText("Olá!");

    lastEventSource!.simulateMessage({ type: "typing", payload: { on: true } });
    await screen.findByTestId("typing-indicator");

    lastEventSource!.simulateMessage({ type: "typing", payload: { on: false } });
    await waitFor(() => {
      expect(screen.queryByTestId("typing-indicator")).not.toBeInTheDocument();
    });
  });

  it("renders PIX QR on SSE 'payment_qr' events", async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          session_id: "s",
          bot_display_name: "Pizzaria",
          welcome_message: "Olá!",
          theme: {},
          plan_tier: "pro_monthly",
        },
      },
    ]);
    renderWithProviders(<ZenBotsWidget botId={1} />);
    await screen.findByText("Olá!");

    lastEventSource!.simulateMessage({
      type: "payment_qr",
      payload: {
        qr_data_url: "data:image/png;base64,FAKEQR",
        payment_url: "https://mp.example/pay/123",
        expires_at: "2026-05-20T00:00:00Z",
      },
    });

    expect(await screen.findByAltText("QR Code PIX")).toBeInTheDocument();
    const mpLink = screen.getByText("Abrir no Mercado Pago");
    expect(mpLink).toHaveAttribute("href", "https://mp.example/pay/123");
  });

  it("posts the message and renders an optimistic user bubble on submit", async () => {
    const fetchMock = mockFetchSequence([
      // /session response
      {
        status: 200,
        body: {
          session_id: "s",
          bot_display_name: "Pizzaria",
          welcome_message: "Olá!",
          theme: {},
          plan_tier: "free",
        },
      },
      // /message response
      { status: 202, body: { accepted: true, message_id: "m1" } },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<ZenBotsWidget botId={7} />);
    await screen.findByText("Olá!");

    const input = screen.getByLabelText("Digite sua mensagem");
    await user.type(input, "quero uma coca");
    await user.click(screen.getByText("Enviar"));

    expect(await screen.findByText("quero uma coca")).toBeInTheDocument();

    // Verify the POST happened to the right URL with the right body.
    const calls = fetchMock.mock.calls as Array<
      [string, { method: string; body: string }]
    >;
    const messageCall = calls.find(([url]) =>
      url.endsWith("/chat/7/message"),
    );
    expect(messageCall).toBeDefined();
    expect(messageCall![1].method).toBe("POST");
    const body = JSON.parse(messageCall![1].body);
    expect(body.text).toBe("quero uma coca");
    expect(body.session_id).toBe("s");
    expect(typeof body.message_id).toBe("string");
  });

  it("shows the Powered-by-ZenBotZ footer on free tier and hides it on pro", async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          session_id: "s",
          bot_display_name: "Pizzaria",
          welcome_message: "Olá!",
          theme: {},
          plan_tier: "free",
        },
      },
    ]);
    const { unmount } = renderWithProviders(<ZenBotsWidget botId={1} />);
    expect(await screen.findByText(/Powered by/i)).toBeInTheDocument();
    unmount();
    vi.unstubAllGlobals();

    mockFetchSequence([
      {
        status: 200,
        body: {
          session_id: "s",
          bot_display_name: "Pizzaria",
          welcome_message: "Olá!",
          theme: {},
          plan_tier: "pro_monthly",
        },
      },
    ]);
    renderWithProviders(<ZenBotsWidget botId={2} />);
    await screen.findByText("Olá!");
    expect(screen.queryByText(/Powered by/i)).not.toBeInTheDocument();
  });

  it("surfaces the widget_disabled error inline (no chat input shown)", async () => {
    mockFetchSequence([
      {
        status: 403,
        body: {
          detail: {
            error: "web_widget_disabled",
            message: "Este restaurante não aceita pedidos pelo widget no momento.",
          },
        },
      },
    ]);
    renderWithProviders(<ZenBotsWidget botId={99} />);

    expect(
      await screen.findByText(/canal de pedidos pelo site está indisponível/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Digite sua mensagem")).not.toBeInTheDocument();
  });
});
