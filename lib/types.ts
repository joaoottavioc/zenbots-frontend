// Centralized domain types for the ZenBots frontend

export interface Bot {
  id: number;
  restaurant_name: string;
  whatsapp_number?: string;
  whatsapp_token?: string;
  phone_number_id?: string;
  pix_key?: string;
  is_open?: boolean;
  closing_message?: string;
  delivery_fee?: number;
  min_order_value?: number;
  cep?: string;
  address?: string;
  max_delivery_radius?: number;
  latitude?: number;
  longitude?: number;
  menu_url?: string | null;
  schedule?: Record<string, { active: boolean; start: string; end: string }>;
}

export interface BotFormValues {
  restaurant_name: string;
  whatsapp_number: string;
  pix_key: string;
  delivery_fee?: number;
  min_order_value?: number;
  cep: string;
  address: string;
  max_delivery_radius: number;
  latitude?: number;
  longitude?: number;
  whatsapp_token: string;
  phone_number_id: string;
  is_open: boolean;
  closing_message?: string;
  schedule?: Record<string, { active: boolean; start: string; end: string }>;
}

export interface OnboardingPayload {
  business_id: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  display_phone_number: string | null;
  code: string | null;
  access_token: string | null;
}

// Re-export pedidos types for convenience
export type { Order, OrderStatus, OrderItem } from '@/app/(portal)/pedidos/types';
