/**
 * Widget API client — thin wrapper around fetch + EventSource.
 *
 * Deliberately uses native browser APIs (fetch, EventSource, crypto.randomUUID)
 * instead of axios or other deps already in the project — keeps the widget
 * bundle small and avoids pulling in the dashboard's API client machinery.
 *
 * Backend contract: zenbots/app/chat_routes.py.
 *   POST /chat/{bot_id}/session   → ChatSessionResponse
 *   POST /chat/{bot_id}/message   → ChatMessageAccepted (202)
 *   GET  /chat/{bot_id}/stream?session_id=...  → SSE
 */

import type {
  ChatMessageAccepted,
  ChatMessageRequest,
  ChatSessionResponse,
} from "./types";

/** Resolve the backend base URL.
 *
 * In Next.js, `process.env.NEXT_PUBLIC_API_BASE_URL` is replaced at build
 * time. The same env var the dashboard already uses for its own API
 * calls — no new config required. Defaults to localhost for dev when
 * the var is missing.
 */
function apiBase(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;
  return fromEnv || "http://localhost:8000";
}

/** Generate a unique-enough message id without pulling in uuid. */
export function generateMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers — the backend just stores it as a unique
  // string for dedup, so format flexibility is fine.
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** POST /chat/{bot_id}/session — handshake.
 *
 * Returns the welcome message + theme + plan tier. The widget calls this
 * on mount before opening the SSE stream so the UI can render before the
 * customer types anything.
 */
export async function fetchChatSession(
  botId: number,
): Promise<ChatSessionResponse> {
  const res = await fetch(`${apiBase()}/chat/${botId}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new ChatApiError(
      `Session handshake failed`,
      res.status,
      await safeJson(res),
    );
  }
  return res.json();
}

/** POST /chat/{bot_id}/message — send a customer message.
 *
 * Returns 202 immediately; the bot's reply arrives on the SSE stream
 * the caller should already have open.
 */
export async function postChatMessage(
  botId: number,
  payload: ChatMessageRequest,
): Promise<ChatMessageAccepted> {
  const res = await fetch(`${apiBase()}/chat/${botId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new ChatApiError(
      `Message send failed`,
      res.status,
      await safeJson(res),
    );
  }
  return res.json();
}

/** Build the SSE stream URL — EventSource is opened by the hook layer. */
export function buildChatStreamUrl(botId: number, sessionId: string): string {
  const params = new URLSearchParams({ session_id: sessionId });
  return `${apiBase()}/chat/${botId}/stream?${params.toString()}`;
}

// ── Errors ───────────────────────────────────────────────────────────

export class ChatApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(`${message} (HTTP ${status})`);
    this.name = "ChatApiError";
    this.status = status;
    this.detail = detail;
  }

  /** True iff the backend returned a structured detail dict like
   *  `{error: "...", message: "..."}` so the UI can branch on the
   *  machine-readable code. */
  errorCode(): string | null {
    if (
      this.detail &&
      typeof this.detail === "object" &&
      "detail" in this.detail &&
      this.detail.detail &&
      typeof this.detail.detail === "object" &&
      "error" in this.detail.detail
    ) {
      return String((this.detail.detail as { error: unknown }).error);
    }
    return null;
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
