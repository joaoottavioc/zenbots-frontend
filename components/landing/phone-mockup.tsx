"use client";

import { useEffect, useState } from "react";

/**
 * Animated iPhone-style mockup of a ZenBotZ WhatsApp conversation.
 *
 * Stage timeline (loops forever):
 *   0  greeting (700ms)
 *   1  + audio #1 + playhead + transcription "me manda um smash duplo bacon aí" (3800ms)
 *   2  bot typing dots (1100ms)
 *   3  typing -> cart confirmation (1500ms)
 *   4  + audio #2 + playhead + transcription "pode fechar" (2400ms)
 *   5  + bot payment-method question (1900ms)
 *   6  + user "PIX" reply (1100ms)
 *   7  + bot PIX QR card (5500ms)
 *   -> reset to 0
 */
const STAGE_DELAYS: Record<number, number> = {
  0: 700,
  1: 3800,
  2: 1100,
  3: 1500,
  4: 2400,
  5: 1900,
  6: 1100,
  7: 5500,
};

const TOTAL_STAGES = 8;

const TRANSCRIPTION_WORDS_1 = [
  "me",
  "manda",
  "um",
  "smash",
  "duplo",
  "bacon",
  "aí",
  "🍔",
];

const TRANSCRIPTION_WORDS_2 = ["pode", "fechar"];

export function PhoneMockup() {
  const [stage, setStage] = useState(0);
  // bumped on every loop reset so animations re-trigger via React keys
  const [loop, setLoop] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = (current: number) => {
      if (cancelled) return;
      timeoutId = setTimeout(() => {
        const next = (current + 1) % TOTAL_STAGES;
        setStage(next);
        if (next === 0) setLoop((l) => l + 1);
        tick(next);
      }, STAGE_DELAYS[current]);
    };

    tick(0);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="relative isolate mx-auto w-[300px] sm:w-[320px]">
      {/* Cyan glow behind the device */}
      <div
        aria-hidden
        className="absolute inset-x-0 -bottom-12 -z-10 mx-auto h-56 w-[120%] rounded-full bg-cyan-300/40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -inset-x-12 -top-8 -z-10 h-64 rounded-full bg-cyan-200/30 blur-3xl"
      />

      {/* Cartoon transcription callouts — one per audio, only while playing */}
      {stage === 1 && (
        <CartoonTranscription
          key={`cartoon-1-${loop}`}
          words={TRANSCRIPTION_WORDS_1}
          baseDelay={0.45}
          stagger={0.3}
        />
      )}
      {stage === 4 && (
        <CartoonTranscription
          key={`cartoon-2-${loop}`}
          words={TRANSCRIPTION_WORDS_2}
          baseDelay={0.4}
          stagger={0.7}
        />
      )}

      {/* Phone outer frame */}
      <div className="relative rounded-[2.75rem] bg-slate-900 p-[10px] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.1)] ring-1 ring-slate-800/40">
        {/* Side buttons */}
        <span aria-hidden className="absolute -left-[2px] top-24 h-12 w-[3px] rounded-l-sm bg-slate-700" />
        <span aria-hidden className="absolute -left-[2px] top-40 h-16 w-[3px] rounded-l-sm bg-slate-700" />
        <span aria-hidden className="absolute -right-[2px] top-32 h-20 w-[3px] rounded-r-sm bg-slate-700" />

        {/* Screen */}
        <div className="relative h-[640px] overflow-hidden rounded-[2.25rem] bg-[#efeae2]">
          {/* Dynamic island / notch */}
          <div
            aria-hidden
            className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-slate-900"
          />

          {/* Status bar */}
          <div className="flex items-center justify-between bg-[#008069] px-6 pb-1 pt-3 text-[11px] font-semibold text-white">
            <span className="tabular-nums">9:41</span>
            <span className="flex items-center gap-1">
              <svg className="h-2.5 w-3.5" viewBox="0 0 18 12" fill="currentColor">
                <rect x="0" y="9" width="3" height="3" rx="0.5" />
                <rect x="5" y="6" width="3" height="6" rx="0.5" />
                <rect x="10" y="3" width="3" height="9" rx="0.5" />
                <rect x="15" y="0" width="3" height="12" rx="0.5" />
              </svg>
              <svg className="h-3 w-3.5" viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 11.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zm-3-3.7a4.2 4.2 0 016 0l1.1-1.1a5.7 5.7 0 00-8.2 0L5 7.8zm-2.5-2.5a7.7 7.7 0 0111 0l1.1-1.1a9.2 9.2 0 00-13.2 0L2.5 5.3z" />
              </svg>
              <span className="ml-0.5 flex h-3 w-6 items-center rounded-[3px] border border-white/80 p-[1px]">
                <span className="block h-full w-[80%] rounded-[1px] bg-white" />
              </span>
            </span>
          </div>

          {/* WhatsApp chat header */}
          <div className="flex items-center gap-3 bg-[#008069] px-3 pb-3 pt-1 text-white">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-inner">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5h18M5 9.5a7 7 0 0114 0M4 13.5h16M4 13.5l1 4a2 2 0 002 1.5h10a2 2 0 002-1.5l1-4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight">
                Burger House
              </p>
              <p className="text-[10px] leading-tight text-white/85">online</p>
            </div>
            <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </div>

          {/* Chat thread — bottom-anchored so messages push up as they arrive */}
          <div className="absolute inset-x-0 bottom-12 top-[88px] flex flex-col justify-end gap-2 overflow-hidden px-3 pb-2">
            {/* Day separator */}
            <div className="flex justify-center pb-1">
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-500 shadow-sm">
                Hoje
              </span>
            </div>

            {/* Bot greeting — always visible */}
            <BotBubble key={`greet-${loop}`}>
              Olá! Bem-vindo à Burger House <span aria-hidden>🍔</span>
              <br />
              Quer fazer um pedido?
            </BotBubble>

            {/* Stage 1+: User audio #1 (smash duplo bacon) */}
            {stage >= 1 && (
              <UserAudioBubble
                key={`audio-1-${loop}`}
                playing={stage === 1}
                duration="3.5s"
                label="0:08"
              />
            )}

            {/* Stage 2: Bot typing */}
            {stage === 2 && <BotTypingBubble key={`typing-${loop}`} />}

            {/* Stage 3+: Bot cart confirmation */}
            {stage >= 3 && (
              <BotBubble key={`cart-${loop}`}>
                <span className="mb-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-cyan-600">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  Áudio entendido
                </span>
                Anotei seu pedido:
                <br />
                <strong className="text-slate-900">1× Smash Duplo Bacon</strong>
                <br />
                <span className="text-slate-500">Total: R$ 32,90</span>
              </BotBubble>
            )}

            {/* Stage 4+: User audio #2 (pode fechar) */}
            {stage >= 4 && (
              <UserAudioBubble
                key={`audio-2-${loop}`}
                playing={stage === 4}
                duration="2s"
                label="0:03"
              />
            )}

            {/* Stage 5+: Bot payment method question */}
            {stage >= 5 && (
              <BotBubble key={`payment-${loop}`}>
                Qual será a forma de pagamento?
                <br />
                <span className="mr-2">💵&nbsp;Dinheiro</span>
                <span className="mr-2 text-slate-300">·</span>
                <span className="mr-2">📱&nbsp;PIX</span>
                <span className="mr-2 text-slate-300">·</span>
                <span>💳&nbsp;Cartão</span>
              </BotBubble>
            )}

            {/* Stage 6+: User picks PIX */}
            {stage >= 6 && (
              <UserTextBubble key={`user-pix-${loop}`}>PIX 📱</UserTextBubble>
            )}

            {/* Stage 7+: Bot PIX card */}
            {stage >= 7 && (
              <BotBubble key={`pix-${loop}`} compact>
                <PixCard />
              </BotBubble>
            )}
          </div>

          {/* Input bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-slate-200 bg-[#f0f2f5] px-2 py-2">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
            <span className="flex-1 truncate rounded-full bg-white px-3 py-1.5 text-[11px] text-slate-400">
              Mensagem
            </span>
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#008069] text-white shadow-md">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Cartoon transcription callout
   ───────────────────────────────────────────── */

function CartoonTranscription({
  words,
  baseDelay = 0.45,
  stagger = 0.3,
}: {
  words: ReadonlyArray<string>;
  baseDelay?: number;
  stagger?: number;
}) {
  return (
    <div
      className={
        // Mobile: just above the phone screen, centered
        "absolute z-20 left-1/2 -top-16 w-[230px] -translate-x-1/2 " +
        // Desktop (sm+): right beside the audio bubble (which is at the bottom of the chat),
        // overlapping the phone's right edge slightly so the connection is obvious
        "sm:left-auto sm:right-[-200px] sm:top-[510px] sm:w-[210px] sm:translate-x-0"
      }
    >
      <div
        className="relative"
        style={{
          animation: "cartoon-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* The callout — landing-style: white bg, cyan border, soft cyan shadow */}
        <div className="relative rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-xl shadow-cyan-500/15 ring-1 ring-cyan-100/60">
          {/* Transcription — sober sans, word-by-word reveal */}
          <p className="text-[14px] font-medium leading-relaxed text-slate-700">
            <span aria-hidden className="mr-1 text-cyan-500">&ldquo;</span>
            {words.map((word, i) => {
              const isEmoji = word === "🍔";
              const isLast = i === words.length - 1;
              const startDelay = baseDelay + i * stagger;
              return (
                <span
                  key={i}
                  className={`inline-block opacity-0 ${isLast ? "" : "mr-1"}`}
                  style={{
                    animation: `word-reveal 0.4s ease-out ${startDelay}s forwards`,
                  }}
                >
                  <span
                    className={isEmoji ? "inline-block align-middle" : ""}
                    style={
                      isEmoji
                        ? {
                            animation: `emoji-pop 0.7s ease-in-out ${startDelay + 0.4}s infinite`,
                          }
                        : undefined
                    }
                  >
                    {word}
                  </span>
                </span>
              );
            })}
            <span aria-hidden className="ml-1 text-cyan-500">&rdquo;</span>
          </p>
        </div>

        {/* Mobile arrow — short curve pointing down into the phone */}
        <svg
          className="absolute -bottom-7 left-1/2 h-8 w-8 -translate-x-1/2 sm:hidden"
          viewBox="0 0 32 32"
          fill="none"
        >
          <path
            d="M 16 2 Q 22 14, 18 28"
            stroke="#0891b2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="60"
            strokeDashoffset="60"
            style={{
              animation: "draw-arrow 0.6s ease-out 0.3s forwards",
            }}
          />
          <path
            d="M 13 22 L 18 28 L 24 23"
            stroke="#0891b2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0"
            style={{
              animation: "draw-arrow 0.3s ease-out 0.85s forwards",
              strokeDasharray: "30",
            }}
          />
        </svg>

        {/* Desktop arrow — tiny pointer from callout's left side into the phone */}
        <svg
          className="absolute hidden -left-6 top-1/2 h-6 w-7 -translate-y-1/2 sm:block"
          viewBox="0 0 28 24"
          fill="none"
        >
          <path
            d="M 26 4 Q 14 8, 4 14"
            stroke="#0891b2"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="40"
            strokeDashoffset="40"
            style={{
              animation: "draw-arrow 0.5s ease-out 0.3s forwards",
            }}
          />
          <path
            d="M 9 11 L 4 14 L 8 19"
            stroke="#0891b2"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0"
            style={{
              animation: "draw-arrow 0.3s ease-out 0.75s forwards",
              strokeDasharray: "30",
            }}
          />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Bubbles
   ───────────────────────────────────────────── */

function BotBubble({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className="flex justify-start"
      style={{ animation: "message-in 0.4s ease-out forwards" }}
    >
      <div
        className={`max-w-[82%] rounded-lg rounded-tl-sm bg-white text-[12px] leading-snug text-slate-800 shadow-[0_1px_0.5px_rgba(15,23,42,0.13)] ${
          compact ? "p-1.5" : "px-2.5 py-1.5"
        }`}
      >
        {children}
        {!compact && (
          <span className="ml-1.5 inline-block text-[9px] text-slate-400 tabular-nums">
            14:32
          </span>
        )}
      </div>
    </div>
  );
}

function UserTextBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex justify-end"
      style={{ animation: "message-in 0.4s ease-out forwards" }}
    >
      <div className="max-w-[82%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 shadow-[0_1px_0.5px_rgba(15,23,42,0.13)]">
        <span className="text-[12px] leading-snug text-slate-800">{children}</span>
        <span className="ml-1.5 inline-block text-[9px] text-slate-400 tabular-nums">
          14:33
        </span>
      </div>
    </div>
  );
}

function BotTypingBubble() {
  return (
    <div
      className="flex justify-start"
      style={{ animation: "message-in 0.3s ease-out forwards" }}
    >
      <div className="flex items-center gap-1.5 rounded-lg rounded-tl-sm bg-white px-3 py-2 shadow-[0_1px_0.5px_rgba(15,23,42,0.13)]">
        <span
          className="block h-1.5 w-1.5 rounded-full bg-slate-500"
          style={{ animation: "typing-dot 1.2s ease-in-out 0ms infinite" }}
        />
        <span
          className="block h-1.5 w-1.5 rounded-full bg-slate-500"
          style={{ animation: "typing-dot 1.2s ease-in-out 200ms infinite" }}
        />
        <span
          className="block h-1.5 w-1.5 rounded-full bg-slate-500"
          style={{ animation: "typing-dot 1.2s ease-in-out 400ms infinite" }}
        />
      </div>
    </div>
  );
}

const BARS = [4, 6, 9, 12, 7, 4, 8, 11, 9, 5, 7, 10, 13, 9, 6, 4, 7, 5];

function UserAudioBubble({
  playing,
  duration = "3.5s",
  label = "0:08",
}: {
  playing: boolean;
  duration?: string;
  label?: string;
}) {
  return (
    <div
      className="flex justify-end"
      style={{ animation: "message-in 0.4s ease-out forwards" }}
    >
      <div className="flex max-w-[82%] items-center gap-2 rounded-lg rounded-tr-sm bg-[#d9fdd3] px-2.5 py-2 shadow-[0_1px_0.5px_rgba(15,23,42,0.13)]">
        {/* Avatar */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[8px] font-bold text-white">
          V
        </span>
        {/* Play / pause icon */}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-700">
          {playing ? (
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="0.5" />
              <rect x="14" y="5" width="4" height="14" rx="0.5" />
            </svg>
          ) : (
            <svg className="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
        {/* Waveform with playhead overlay */}
        <span className="relative flex h-5 items-center gap-[1.5px]">
          {/* Background bars (unplayed) */}
          {BARS.map((h, i) => (
            <span
              key={`bg-${i}`}
              className="block w-[1.5px] rounded-full bg-slate-400"
              style={{ height: `${h}px` }}
            />
          ))}
          {/* Foreground bars (played) — clipped by animated width */}
          {playing && (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 flex items-center gap-[1.5px] overflow-hidden"
              style={{
                width: "0%",
                animation: `audio-playhead ${duration} linear forwards`,
              }}
            >
              {BARS.map((h, i) => (
                <span
                  key={`fg-${i}`}
                  className="block w-[1.5px] shrink-0 rounded-full bg-cyan-700"
                  style={{ height: `${h}px` }}
                />
              ))}
            </span>
          )}
        </span>
        {/* Duration + read receipts */}
        <div className="flex flex-col items-end leading-none">
          <span className="text-[9px] tabular-nums text-slate-600">{label}</span>
          <span className="mt-0.5 flex items-center gap-0.5 text-[8px] text-slate-500">
            <span className="tabular-nums">14:31</span>
            <svg className="h-2 w-2.5 text-cyan-600" fill="none" viewBox="0 0 16 11" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 6l3 3 7-8M6 9l3 1 6-8" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PIX Card
   ───────────────────────────────────────────── */

const QR_PATTERN: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1],
  [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1],
];

function PixCard() {
  return (
    <div className="rounded-md bg-slate-50 p-2 ring-1 ring-slate-200">
      <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
        <span className="flex items-center gap-1.5">
          <span className="rounded-sm bg-emerald-500/15 px-1 py-0.5 text-[8px] font-bold tracking-wider text-emerald-700 ring-1 ring-emerald-500/30">
            PIX
          </span>
          <span className="text-[9px] font-medium text-slate-500">Pagamento</span>
        </span>
        <span className="font-heading text-[11px] font-bold tabular-nums text-slate-900">
          R$ 32,90
        </span>
      </div>
      <div className="mx-auto grid w-fit grid-cols-[repeat(17,minmax(0,1fr))] gap-px rounded-sm bg-white p-1">
        {QR_PATTERN.flatMap((row, i) =>
          row.map((cell, j) => (
            <span
              key={`${i}-${j}`}
              className={`block h-[3px] w-[3px] ${cell ? "bg-slate-900" : "bg-white"}`}
            />
          )),
        )}
      </div>
      <p className="mt-1 text-center text-[8px] text-slate-500">
        Toque para copiar o código
      </p>
    </div>
  );
}
