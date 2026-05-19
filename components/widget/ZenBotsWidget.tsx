/**
 * ZenBotsWidget — the chat UI rendered inside the iframe.
 *
 * Plan: in_browser_bots.md §3.1. Single-bubble chat list + input + send
 * button + typing indicator + PIX QR rendering + Free-tier "Powered by
 * ZenBotZ®" footer.
 *
 * Styling intentionally uses only inline styles + tailwind utility classes
 * that already exist in the dashboard — keeps the widget self-contained
 * and avoids bringing in new design tokens. The iframe gives us layout
 * isolation from the host site, so we don't have to worry about parent
 * CSS leaking in.
 *
 * Mobile (< 640px viewport): full-screen takeover. Desktop: the iframe's
 * sizing is controlled by the parent loader.js, so the component just
 * fills its container.
 */

"use client";

import { useEffect, useRef, useState } from "react";

import { useChat } from "./useChat";
import type { ChatBubble } from "./types";

interface ZenBotsWidgetProps {
  botId: number;
}

export function ZenBotsWidget({ botId }: ZenBotsWidgetProps) {
  const { session, messages, isTyping, fatalError, sendMessage } = useChat({
    botId,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest message whenever the list grows or typing
  // toggles. Uses scrollIntoView's smooth behavior for an unobtrusive UX.
  // jsdom (the test environment) doesn't implement scrollIntoView, so we
  // gate the call — no need to polyfill it in tests.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  const primaryColor = session?.theme?.primary_color || "#00B14F";
  const showFreeTierFooter = (session?.plan_tier ?? "free") === "free";

  if (fatalError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-700">{fatalError}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
          {(session?.bot_display_name ?? "B").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">
            {session?.bot_display_name ?? "Restaurante"}
          </span>
          <span className="text-xs text-white/80">
            Atendimento automático
          </span>
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-4">
        <ul className="flex flex-col gap-2">
          {messages.map((m) => (
            <BubbleView key={m.id} bubble={m} primaryColor={primaryColor} />
          ))}
          {isTyping && <TypingDots />}
        </ul>
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t bg-white px-3 py-3"
      >
        <label htmlFor="zenbotz-input" className="sr-only">
          Digite sua mensagem
        </label>
        <input
          id="zenbotz-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem"
          autoComplete="off"
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none"
          maxLength={4096}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          Enviar
        </button>
      </form>

      {/* Free-tier footer */}
      {showFreeTierFooter && (
        <a
          href="https://zenbotz.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gray-50 py-1 text-center text-[10px] text-gray-500 hover:text-gray-700"
        >
          Powered by <span className="font-semibold">ZenBotZ®</span>
        </a>
      )}
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────

interface BubbleProps {
  bubble: ChatBubble;
  primaryColor: string;
}

function BubbleView({ bubble, primaryColor }: BubbleProps) {
  const isUser = bubble.role === "user";
  return (
    <li
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`bubble-${bubble.role}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "rounded-br-sm text-white"
            : "rounded-bl-sm bg-white text-gray-900 shadow-sm"
        }`}
        style={isUser ? { backgroundColor: primaryColor } : undefined}
      >
        {bubble.text}
        {/* Attachments: render an image attachment inline; for documents
            (PDF cardápio), show a link the customer can tap to download. */}
        {bubble.attachments?.map((a, i) => (
          <AttachmentView key={i} url={a.url} type={a.type} />
        ))}
        {/* PIX QR rendering — separate from generic attachments because it
            has its own copy-button UX. */}
        {bubble.paymentQR && <PaymentQRView qr={bubble.paymentQR} />}
      </div>
    </li>
  );
}

function AttachmentView({ url, type }: { url: string; type: string }) {
  if (type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Anexo"
        className="mt-2 max-h-64 w-full rounded-lg object-contain"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block text-xs underline"
    >
      Abrir anexo
    </a>
  );
}

function PaymentQRView({
  qr,
}: {
  qr: { qr_data_url: string; payment_url: string; expires_at: string };
}) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr.qr_data_url}
        alt="QR Code PIX"
        className="h-48 w-48 rounded-lg bg-white p-2"
      />
      <a
        href={qr.payment_url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
      >
        Abrir no Mercado Pago
      </a>
      <span className="text-[10px] text-gray-500">
        Validade: 15 minutos
      </span>
    </div>
  );
}

function TypingDots() {
  return (
    <li className="flex justify-start" data-testid="typing-indicator">
      <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">
        <div className="flex gap-1">
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </div>
      </div>
    </li>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
      style={{ animationDelay: delay }}
    />
  );
}
