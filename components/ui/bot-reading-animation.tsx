"use client";

import React, { useId } from "react";

interface BotReadingAnimationProps {
  progress: number;
  status: "active" | "success" | "error";
  size?: number;
}

export function BotReadingAnimation({
  progress,
  status,
  size = 120,
}: BotReadingAnimationProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");

  const stroke = 2.5;
  const padding = 10;
  const r = (size - stroke - padding * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const clamped = Math.min(100, Math.max(0, progress));
  const displayProgress = status === "success" ? 100 : clamped;
  const dashOffset = circumference * (1 - displayProgress / 100);

  const accent =
    status === "success" ? "#10b981" : status === "error" ? "#ef4444" : "#06b6d4";
  const accentSoft =
    status === "success" ? "#34d399" : status === "error" ? "#fca5a5" : "#7dd3fc";

  const isActive = status === "active";

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
        <defs>
          <linearGradient id={`br-arc-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={accentSoft} />
            <stop offset="1" stopColor={accent} />
          </linearGradient>
          <radialGradient id={`br-glow-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={accent} stopOpacity="0.22" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={r + 8}
          fill={`url(#br-glow-${uid})`}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: isActive ? "br-breath 2.8s ease-in-out infinite" : undefined,
            transition: "opacity 400ms ease",
          }}
        />

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(15, 23, 42, 0.06)"
          strokeWidth={stroke}
        />

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#br-arc-${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition:
              "stroke-dashoffset 500ms cubic-bezier(0.4, 0, 0.2, 1), stroke 300ms ease",
          }}
        />

        {isActive && (
          <g
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: "br-orbit 2.4s linear infinite",
            }}
          >
            <circle
              cx={cx}
              cy={cy - r}
              r={3}
              fill={accent}
              style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
            />
          </g>
        )}

        {status === "success" ? (
          <path
            d={`M ${cx - 9} ${cy + 1} L ${cx - 2} ${cy + 8} L ${cx + 10} ${cy - 6}`}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              animation: "br-check 420ms cubic-bezier(0.4, 0, 0.2, 1) both",
            }}
          />
        ) : status === "error" ? (
          <g
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              animation: "br-check 360ms cubic-bezier(0.4, 0, 0.2, 1) both",
            }}
          >
            <line x1={cx - 7} y1={cy - 7} x2={cx + 7} y2={cy + 7} />
            <line x1={cx + 7} y1={cy - 7} x2={cx - 7} y2={cy + 7} />
          </g>
        ) : (
          <circle
            cx={cx}
            cy={cy}
            r="5"
            fill={accent}
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              filter: `drop-shadow(0 0 5px ${accent})`,
              animation: "br-pulse 1.8s ease-in-out infinite",
            }}
          />
        )}
      </svg>
    </div>
  );
}
