"use client";

import React, { useId } from "react";

interface BotReadingAnimationProps {
  progress: number;
  status: "active" | "success" | "error";
}

const LINE_THRESHOLDS = [15, 35, 55, 75, 88];
const LINE_WIDTHS = [92, 78, 96, 68, 84];

export function BotReadingAnimation({ progress, status }: BotReadingAnimationProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");

  const filledCount =
    status === "success"
      ? LINE_THRESHOLDS.length
      : LINE_THRESHOLDS.filter((t) => progress >= t).length;

  const accent =
    status === "success" ? "#10b981" : status === "error" ? "#ef4444" : "#06b6d4";
  const accentSoft =
    status === "success" ? "#6ee7b7" : status === "error" ? "#fca5a5" : "#67e8f9";
  const isActive = status === "active";

  const paperTransform =
    status === "error"
      ? "rotate(-5deg) scaleY(0.68) translate(0, 4px)"
      : "rotate(-3deg)";
  const botTransform =
    status === "success"
      ? "translateY(-5px) rotate(2deg)"
      : "translateY(0) rotate(0)";

  return (
    <div className="relative h-40 w-40" aria-hidden>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <linearGradient id={`br-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accentSoft} />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
          <radialGradient id={`br-halo-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={accent} stopOpacity="0.35" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ambient halo */}
        <circle
          cx="100"
          cy="110"
          r="88"
          fill={`url(#br-halo-${uid})`}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: isActive ? "br-halo 2.6s ease-in-out infinite" : undefined,
          }}
        />

        {/* paper — positioned so bot appears to hold it */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "100px 150px",
            transform: paperTransform,
            transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <rect
            x="40"
            y="118"
            width="120"
            height="62"
            rx="3"
            fill="#ffffff"
            stroke="rgba(15, 23, 42, 0.12)"
            strokeWidth="1"
          />
          {/* folded corner */}
          <path
            d="M 148 118 L 160 118 L 160 130 Z"
            fill="#f1f5f9"
            stroke="rgba(15, 23, 42, 0.1)"
            strokeWidth="1"
          />
          {LINE_THRESHOLDS.map((_, i) => {
            const filled = i < filledCount;
            return (
              <rect
                key={i}
                x="48"
                y={128 + i * 9}
                width={LINE_WIDTHS[i]}
                height="4"
                rx="2"
                fill={filled ? accent : "#e2e8f0"}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "left center",
                  transition: "fill 300ms ease-out",
                  filter:
                    filled && isActive
                      ? `drop-shadow(0 0 3px ${accent})`
                      : undefined,
                  animation: filled
                    ? "br-line-in 420ms cubic-bezier(0.4, 0, 0.2, 1) both"
                    : undefined,
                }}
              />
            );
          })}
        </g>

        {/* bot */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "100px 80px",
            transform: botTransform,
            transition: "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <g
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: isActive ? "br-float 3.2s ease-in-out infinite" : undefined,
            }}
          >
            {/* antenna */}
            <line
              x1="100"
              y1="22"
              x2="100"
              y2="40"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx="100"
              cy="20"
              r="3.5"
              fill={accent}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                filter: `drop-shadow(0 0 3px ${accent})`,
                animation: isActive ? "br-pulse-dot 1.4s ease-in-out infinite" : undefined,
              }}
            />

            {/* head */}
            <rect
              x="68"
              y="40"
              width="64"
              height="50"
              rx="13"
              fill={`url(#br-body-${uid})`}
              stroke="rgba(14, 165, 233, 0.5)"
              strokeWidth="1"
            />

            {/* ear-nubs */}
            <rect x="62" y="58" width="6" height="14" rx="2" fill="#3b82f6" opacity="0.7" />
            <rect x="132" y="58" width="6" height="14" rx="2" fill="#3b82f6" opacity="0.7" />

            {/* visor */}
            <rect x="76" y="54" width="48" height="20" rx="10" fill="#0f172a" />

            {/* scan bar (eye) */}
            <g
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: isActive ? "br-scan 1.8s ease-in-out infinite" : undefined,
              }}
            >
              <rect
                x="80"
                y="58"
                width="12"
                height="12"
                rx="3"
                fill={accent}
                opacity="0.9"
                style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
              />
            </g>

            {/* body — shoulders suggest arms cradling the paper */}
            <path
              d="M 76 90
                 Q 73 98 70 108
                 L 58 120
                 Q 54 126 62 128
                 L 138 128
                 Q 146 126 142 120
                 L 130 108
                 Q 127 98 124 90
                 Z"
              fill={`url(#br-body-${uid})`}
              stroke="rgba(14, 165, 233, 0.5)"
              strokeWidth="1"
            />

            {/* chest core */}
            <circle
              cx="100"
              cy="108"
              r="3.5"
              fill={accent}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                filter: `drop-shadow(0 0 3px ${accent})`,
                animation: isActive ? "br-pulse-dot 1.6s ease-in-out infinite" : undefined,
              }}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
