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
  postChatAudio,
  postChatMessage,
} from "./api";
import type {
  ChatBubble,
  ChatSessionResponse,
  ConnectionStatus,
  DeliveryStatus,
  SSEEvent,
} from "./types";
import { DELIVERY_RANK } from "./types";

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
  /** Upload a recorded audio blob — server transcribes and enqueues a
   *  normal chat message. Mirrors sendMessage's bubble flow but the
   *  initial text is the placeholder "🎤 …" until the transcript lands. */
  sendAudio: (blob: Blob) => Promise<void>;
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

  // Advance a user bubble's status only if the new state outranks the
  // current one. Out-of-order receipts (e.g., "delivered" arriving after
  // "read" because of PubSub ordering) must not regress the tick UI.
  const advanceStatus = useCallback(
    (messageId: string, nextStatus: DeliveryStatus) => {
      setMessages((m) =>
        m.map((b) => {
          if (b.id !== messageId || b.role !== "user") return b;
          const currentRank = b.status ? DELIVERY_RANK[b.status] : -1;
          const nextRank = DELIVERY_RANK[nextStatus];
          if (nextRank <= currentRank) return b;
          return { ...b, status: nextStatus };
        }),
      );
    },
    [],
  );

  const dispatchEvent = useCallback(
    (event: SSEEvent) => {
    switch (event.type) {
      case "ping":
        // Server keep-alive — no UI change.
        return;
      case "typing":
        setIsTyping(event.payload.on);
        return;
      case "receipt": {
        // Backend publishes "delivered" and "read". "sent" is set
        // optimistically below when POST resolves. "failed" is set on
        // the catch branch.
        const status = event.payload.status as DeliveryStatus;
        if (status in DELIVERY_RANK) {
          advanceStatus(event.payload.message_id, status);
        }
        return;
      }
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
    },
    [advanceStatus],
  );

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
          } else if (code === "demo_daily_cap") {
            // The demo abuse cap fires when a single IP creates too
            // many fresh widget sessions in a day. Surface the
            // specific message instead of the generic "couldn't
            // start" so the recruiter knows it's a quota, not a bug.
            setFatalError(
              "Você atingiu o limite diário de sessões no demo. Volte amanhã ou peça acesso ao dashboard.",
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
          status: "sending",
          createdAt: Date.now(),
        },
      ]);

      try {
        await postChatMessage(botId, {
          session_id: sid,
          message_id: messageId,
          text: trimmed,
        });
        // POST returned 200 → message is at least sent. Worker will
        // publish "delivered" + "read" receipts shortly via SSE; the
        // dispatch path advances the tick monotonically from here.
        advanceStatus(messageId, "sent");
      } catch (err: unknown) {
        // Mark the bubble as failed regardless of the error shape — the
        // user-facing feedback below still appends a separate bot bubble
        // explaining what to do. The red "!" trailing the bubble is the
        // primary signal that this specific message didn't go through.
        setMessages((m) =>
          m.map((b) =>
            b.id === messageId && b.role === "user"
              ? { ...b, status: "failed" }
              : b,
          ),
        );
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
    [botId, advanceStatus],
  );

  const sendAudio = useCallback(
    async (blob: Blob) => {
      const sid = sessionIdRef.current;
      if (!sid || !blob || blob.size === 0) return;

      const messageId = generateMessageId();
      // Optimistic bubble with a mic-prefixed placeholder. We patch the
      // text to the transcript when the upload returns, then advance the
      // tick state on each receipt event (same as a typed message).
      setMessages((m) => [
        ...m,
        {
          id: messageId,
          role: "user",
          text: "🎤 transcrevendo…",
          status: "sending",
          createdAt: Date.now(),
        },
      ]);

      try {
        const res = await postChatAudio(botId, {
          sessionId: sid,
          messageId,
          blob,
        });
        // Replace the placeholder text with the actual transcript so the
        // user can confirm what the system heard.
        setMessages((m) =>
          m.map((b) =>
            b.id === messageId && b.role === "user"
              ? { ...b, text: res.transcript ? `🎤 ${res.transcript}` : b.text }
              : b,
          ),
        );
        advanceStatus(messageId, "sent");
      } catch (err: unknown) {
        setMessages((m) =>
          m.map((b) =>
            b.id === messageId && b.role === "user"
              ? { ...b, status: "failed" }
              : b,
          ),
        );
        // Map known backend signals to specific reply bubbles so the
        // user knows what to do.
        let reply =
          "Houve um problema ao enviar o áudio. Tente novamente ou digite a mensagem.";
        if (err instanceof ChatApiError) {
          const code = err.errorCode();
          if (code === "audio_unintelligible") {
            reply =
              "Não consegui entender o áudio. Pode digitar ou gravar de novo?";
          } else if (code === "audio_too_large") {
            reply =
              "Áudio muito longo. Tente uma gravação mais curta (até 90s).";
          } else if (err.status === 429) {
            reply =
              "Muitos áudios em sequência. Aguarde alguns segundos e tente novamente.";
          }
        }
        setMessages((m) => [
          ...m,
          {
            id: generateMessageId(),
            role: "bot",
            text: reply,
            createdAt: Date.now(),
          },
        ]);
      }
    },
    [botId, advanceStatus],
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
    sendAudio,
    disconnect,
  };
}
