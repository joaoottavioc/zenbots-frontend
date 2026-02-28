export type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELED";

export interface OrderItem {
  quantity: number;
  product_name: string;
  price_at_time_of_order?: number;
  notes?: string | null;
}

export interface Order {
  id: number;
  total_amount: number;
  status: OrderStatus;
  payment_method?: string;
  customer_address: string | null;
  created_at: string;
  display_items: OrderItem[];
  customer_phone: string;
  human_takeover_active: boolean;
  timeElapsed?: string;
  customerName?: string;
  fullAddress?: string;
  type?: "DELIVERY" | "PICKUP";
  delivery_fee?: number;
}
