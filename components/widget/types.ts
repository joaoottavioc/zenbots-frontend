/**
 * TypeScript types for the web widget — mirror app/schemas.py on the backend.
 *
 * Source of truth: zenbots/app/schemas.py (ChatMessageRequest,
 * ChatMessageAccepted, ChatSessionResponse, ChatSSE*). When the backend
 * schemas change, update these in lockstep. Both files are versioned via
 * the Phase 2.1 contract in plan/in_browser_bots.md.
 */

// ── HTTP request/response ────────────────────────────────────────────

export interface ChatMessageRequest {
  session_id: string;
  message_id: string;
  text: string;
}

export interface ChatMessageAccepted {
  accepted: boolean;
  message_id: string;
}

export interface ChatSessionResponse {
  session_id: string;
  bot_display_name: string;
  welcome_message: string;
  theme: WidgetTheme;
  /** "free" | "pro_monthly" | "pro_annual" | "founder" — drives the
   *  "Powered by ZenBotZ®" footer rendering. */
  plan_tier: string;
}

// ── Widget theme (sent by /session, customized via Bot.web_widget_theme) ──

export interface WidgetTheme {
  primary_color?: string;
  position?: "br" | "bl" | "tr" | "tl";
  welcome_message?: string;
}

// ── SSE event envelopes (server → widget) ────────────────────────────
// Wrapped in {type, payload} per broadcast.py's convention.

export type SSEEvent =
  | { type: "ping"; payload?: { message?: string } }
  | { type: "typing"; payload: SSETyping }
  | { type: "message"; payload: SSEMessage }
  | { type: "payment_qr"; payload: SSEPaymentQR }
  | { type: "order_status"; payload: SSEOrderStatus };

export interface SSETyping {
  on: boolean;
}

export interface SSEMessage {
  text: string;
  attachments: Attachment[];
}

export interface Attachment {
  type: string; // "image" | "document" | etc.
  url: string;
}

export interface SSEPaymentQR {
  qr_data_url: string;
  payment_url: string;
  expires_at: string; // ISO datetime
}

export interface SSEOrderStatus {
  order_id: number;
  status: string;
}

// ── Widget-internal UI state ─────────────────────────────────────────

export type ChatRole = "user" | "bot";

export interface ChatBubble {
  /** Client-generated; matches the SSE `message_id` for correlation. */
  id: string;
  role: ChatRole;
  text: string;
  attachments?: Attachment[];
  paymentQR?: SSEPaymentQR;
  /** ms timestamp when the bubble was created — for sort ordering. */
  createdAt: number;
}

export type ConnectionStatus =
  | "connecting" // initial SSE open
  | "open" // SSE connected
  | "reconnecting" // dropped, retrying
  | "closed"; // user closed widget or hard error
