import type { AxiosResponse } from 'axios';

export function mockResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse['config'],
  };
}

export function createMockBot(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    restaurant_name: 'Pizzaria Teste',
    is_open: true,
    phone_number_id: 'phone_123',
    whatsapp_number: '5511999999999',
    ...overrides,
  };
}

export function createMockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'X-Bacon',
    price: 25.9,
    description: 'Hambúrguer com bacon',
    is_available: true,
    category: 'Lanches',
    ...overrides,
  };
}

export function createMockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    total_amount: 59.9,
    status: 'PENDING' as const,
    payment_method: 'pix',
    customer_address: 'Rua Teste, 123',
    created_at: new Date().toISOString(),
    display_items: [
      { quantity: 2, product_name: 'X-Bacon', price_at_time_of_order: 25.9, notes: null },
    ],
    customer_phone: '5511999999999',
    human_takeover_active: false,
    timeElapsed: '5m',
    customerName: 'João',
    fullAddress: 'Rua Teste, 123',
    type: 'DELIVERY' as const,
    ...overrides,
  };
}

