/**
 * useChat — manages widget chat state, SSE lifecycle, and message sending.
 *
 * Responsibilities:
 *   - Persist session_id in localStorage so returning visitors keep
 *     conversation history (per the A1b plan: session_id is the identity
 *     key, web:{session_id} is what lands in Contact.phone_number).
 *   - POST /chat/{botId}/session on mount to resolve display name +
 *     welcome message + theme + plan tier.
 *   - Open an EventSource subscription to /chat/{botId}/stream and
 *     dispatch each SSE event into the React state.
 *   - Reconnect on transport error with simple exponential backoff.
 *   - sendMessage(text): POST /chat/{botId}/message and append a
 *     user bubble optimistically.
 *
 * Keeps the React component layer simple — it just renders state.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildChatStreamUrl,
  ChatApiError,
  fetchChatSession,
  generateMessageId,
  postChatMessage,
} from "./api";
import type {
  ChatBubble,
  ChatSessionResponse,
  ConnectionStatus,
  SSEEvent,
} from "./types";

const SESSION_STORAGE_KEY = (botId: number) => `zenbotz:widget:session:${botId}`;

const RECONNECT_INITIAL_MS = 1000;
const RECONNECT_MAX_MS = 30000;

interface UseChatOptions {
  botId: number;
}

interface UseChatReturn {
  session: ChatSessionResponse | null;
  messages: ChatBubble[];
  isTyping: boolean;
  status: ConnectionStatus;
  /** Set when the bot is unreachable or rejected the request (widget
   *  disabled, channel down). Surface to the user as an inline banner. */
  fatalError: string | null;
  sendMessage: (text: string) => Promise<void>;
  /** Manually close the SSE connection — used by the iframe page when
   *  the user dismisses the widget. */
  disconnect: () => void;
}

export function useChat({ botId }: UseChatOptions): UseChatReturn {
  const [session, setSession] = useState<ChatSessionResponse | null>(null);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [fatalError, setFatalError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef<number>(RECONNECT_INITIAL_MS);
  const sessionIdRef = useRef<string | null>(null);
  const closedByCallerRef = useRef<boolean>(false);

  // ── SSE lifecycle ──────────────────────────────────────────────────

  const dispatchEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "ping":
        // Server keep-alive — no UI change.
        return;
      case "typing":
        setIsTyping(event.payload.on);
        return;
      case "message": {
        const bubble: ChatBubble = {
          id: generateMessageId(),
          role: "bot",
          text: event.payload.text,
          attachments: event.payload.attachments,
          createdAt: Date.now(),
        };
        setMessages((m) => [...m, bubble]);
        // A bot message implicitly ends the typing indicator.
        setIsTyping(false);
        return;
      }
      case "payment_qr": {
        const bubble: ChatBubble = {
          id: generateMessageId(),
          role: "bot",
          text: "Aqui está seu código PIX:",
          paymentQR: event.payload,
          createdAt: Date.now(),
        };
        setMessages((m) => [...m, bubble]);
        return;
      }
      case "order_status": {
        const bubble: ChatBubble = {
          id: generateMessageId(),
          role: "bot",
          text: `Pedido #${event.payload.order_id}: ${event.payload.status}`,
          createdAt: Date.now(),
        };
        setMessages((m) => [...m, bubble]);
        return;
      }
    }
  }, []);

  // openStream and scheduleReconnect call each other on reconnect.
  // Break the circular reference with a ref that points at the latest
  // openStream callback — scheduleReconnect reads through the ref instead
  // of capturing openStream directly.
  const openStreamRef = useRef<((sessionId: string) => void) | null>(null);

  const scheduleReconnect = useCallback((sessionId: string) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    const delay = reconnectDelayRef.current;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 2,
        RECONNECT_MAX_MS,
      );
      openStreamRef.current?.(sessionId);
    }, delay);
  }, []);

  const openStream = useCallback(
    (sessionId: string) => {
      if (typeof window === "undefined") return;
      eventSourceRef.current?.close();

      const url = buildChatStreamUrl(botId, sessionId);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("open");
        reconnectDelayRef.current = RECONNECT_INITIAL_MS;
      };

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(e.data) as SSEEvent;
          dispatchEvent(parsed);
        } catch {
          // Ignore malformed events — backend validates JSON before
          // publish, so this should never fire.
        }
      };

      es.onerror = () => {
        if (closedByCallerRef.current) return;
        setStatus("reconnecting");
        es.close();
        scheduleReconnect(sessionId);
      };
    },
    [botId, dispatchEvent, scheduleReconnect],
  );

  // Keep the ref pointed at the latest openStream so scheduleReconnect
  // (which can't capture openStream directly without a cycle) always
  // calls the current version. Inside useEffect to satisfy the
  // react-hooks/refs lint — ref mutation during render is forbidden.
  useEffect(() => {
    openStreamRef.current = openStream;
  }, [openStream]);

  // ── Handshake on mount ─────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    closedByCallerRef.current = false;

    // Resume session if previously stored; otherwise the server issues
    // a fresh UUID via /session and we persist it.
    const stored = localStorage.getItem(SESSION_STORAGE_KEY(botId));

    let cancelled = false;

    fetchChatSession(botId)
      .then((s) => {
        if (cancelled) return;
        // Prefer the stored session_id over the freshly-issued one so
        // returning visitors keep their conversation context.
        const sid = stored || s.session_id;
        sessionIdRef.current = sid;
        localStorage.setItem(SESSION_STORAGE_KEY(botId), sid);
        setSession({ ...s, session_id: sid });

        // Seed an initial welcome bubble from the server's text.
        setMessages([
          {
            id: generateMessageId(),
            role: "bot",
            text: s.welcome_message,
            createdAt: Date.now(),
          },
        ]);

        openStream(sid);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ChatApiError) {
          const code = err.errorCode();
          if (code === "web_widget_disabled" || code === "web_channel_disabled") {
            setFatalError(
              "O canal de pedidos pelo site está indisponível no momento.",
            );
          } else if (err.status === 404) {
            setFatalError("Restaurante não encontrado.");
          } else {
            setFatalError("Não foi possível iniciar a conversa.");
          }
        } else {
          setFatalError("Não foi possível iniciar a conversa.");
        }
        setStatus("closed");
      });

    return () => {
      cancelled = true;
      closedByCallerRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [botId, openStream]);

  // ── Outbound message ───────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const sid = sessionIdRef.current;
      if (!sid) return;

      const messageId = generateMessageId();
      // Optimistic user bubble — the backend stores the message itself
      // via ConversationHistory, but the UI shouldn't wait for the
      // round-trip to render what the user just typed.
      setMessages((m) => [
        ...m,
        {
          id: messageId,
          role: "user",
          text: trimmed,
          createdAt: Date.now(),
        },
      ]);

      try {
        await postChatMessage(botId, {
          session_id: sid,
          message_id: messageId,
          text: trimmed,
        });
      } catch (err: unknown) {
        if (err instanceof ChatApiError && err.status === 429) {
          // Per-IP rate limit. Don't show as a fatal — the user can
          // try again in a few seconds. Append a friendly note.
          setMessages((m) => [
            ...m,
            {
              id: generateMessageId(),
              role: "bot",
              text: "Recebi muitas mensagens muito rápido. Aguarde alguns segundos e tente novamente.",
              createdAt: Date.now(),
            },
          ]);
        } else {
          setMessages((m) => [
            ...m,
            {
              id: generateMessageId(),
              role: "bot",
              text: "Houve um problema ao enviar sua mensagem. Tente novamente.",
              createdAt: Date.now(),
            },
          ]);
        }
      }
    },
    [botId],
  );

  const disconnect = useCallback(() => {
    closedByCallerRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    eventSourceRef.current?.close();
    setStatus("closed");
  }, []);

  return {
    session,
    messages,
    isTyping,
    status,
    fatalError,
    sendMessage,
    disconnect,
  };
}
