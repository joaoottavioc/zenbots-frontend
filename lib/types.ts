// Centralized domain types for the ZenBots frontend

export interface User {
  id: number;
  email: string;
  is_email_verified: boolean;
  is_admin: boolean;
}

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
  restaurant_image_url?: string | null;
  schedule?: Record<string, { active: boolean; start: string; end: string }>;
  default_delivery_time_minutes?: number | null;
  default_pickup_time_minutes?: number | null;
  owner_notification_phone?: string | null;
  cancellation_window_minutes?: number | null;
}

export interface BotFormValues {
  restaurant_name: string;
  delivery_fee?: number;
  min_order_value?: number;
  cep: string;
  address: string;
  max_delivery_radius: number;
  latitude?: number;
  longitude?: number;
  is_open: boolean;
  closing_message?: string;
  schedule?: Record<string, { active: boolean; start: string; end: string }>;
  default_delivery_time_minutes?: number | null;
  default_pickup_time_minutes?: number | null;
  owner_notification_phone?: string | null;
  cancellation_window_minutes?: number | null;
}

export interface Plan {
  id: number;
  key: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  frequency: number;
}
