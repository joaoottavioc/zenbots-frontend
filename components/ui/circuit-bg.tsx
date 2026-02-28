import React from "react";

export const CircuitBg = React.memo(function CircuitBg() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* Subtle dot grid background for depth */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, #22d3ee 0.5px, transparent 0.5px)",
          backgroundSize: "16px 16px",
          maskImage: "linear-gradient(to right, black 0%, black 20%, transparent 65%)",
          WebkitMaskImage: "linear-gradient(to right, black 0%, black 20%, transparent 65%)",
        }}
      />

      <svg
        width="100%"
        height="64"
        viewBox="0 0 900 64"
        preserveAspectRatio="xMinYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          maskImage: "linear-gradient(to right, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.05) 78%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to right, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.05) 78%, transparent 88%)",
        }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="traceGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="traceGradAlt" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* PROCESSOR NODE */}
        <rect x="8" y="16" width="32" height="32" rx="4" stroke="#22d3ee" strokeWidth="0.6" strokeOpacity="0.3" fill="none" />
        <rect x="12" y="20" width="24" height="24" rx="2.5" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.8" fill="#22d3ee" fillOpacity="0.04" />
        <circle cx="24" cy="32" r="3" fill="#22d3ee" fillOpacity="0.9" filter="url(#glow)">
          <animate attributeName="fillOpacity" values="0.9;0.5;0.9" dur="3s" repeatCount="indefinite" />
        </circle>
        <line x1="17" y1="32" x2="31" y2="32" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.35" />
        <line x1="24" y1="25" x2="24" y2="39" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.35" />

        {/* PROCESSOR PINS */}
        <line x1="20" y1="16" x2="20" y2="11" stroke="#22d3ee" strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="28" y1="16" x2="28" y2="11" stroke="#22d3ee" strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="20" y1="48" x2="20" y2="53" stroke="#22d3ee" strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="28" y1="48" x2="28" y2="53" stroke="#22d3ee" strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="36" y1="26" x2="44" y2="26" stroke="#22d3ee" strokeWidth="0.7" strokeOpacity="0.7" />
        <line x1="36" y1="32" x2="44" y2="32" stroke="#22d3ee" strokeWidth="0.9" strokeOpacity="0.85" />
        <line x1="36" y1="38" x2="44" y2="38" stroke="#22d3ee" strokeWidth="0.7" strokeOpacity="0.7" />

        {/* PRIMARY TRACES */}
        <path d="M20 11 L20 8 L48 8 L56 14 L680 14" stroke="url(#traceGradAlt)" strokeWidth="0.6" strokeLinecap="round" />
        <line x1="44" y1="32" x2="820" y2="32" stroke="url(#traceGrad)" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M20 53 L20 56 L48 56 L56 50 L640 50" stroke="url(#traceGradAlt)" strokeWidth="0.6" strokeLinecap="round" />

        {/* SECONDARY TRACES */}
        <path d="M44 26 L60 26 L72 20 L440 20" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.4" strokeLinecap="round" />
        <path d="M44 38 L60 38 L72 44 L440 44" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.4" strokeLinecap="round" />

        {/* NODE CLUSTER 1 */}
        <circle cx="90" cy="32" r="4" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.5" fill="none" />
        <circle cx="90" cy="32" r="1.5" fill="#22d3ee" fillOpacity="0.75">
          <animate attributeName="fillOpacity" values="0.75;0.4;0.75" dur="4s" begin="0.5s" repeatCount="indefinite" />
        </circle>
        <line x1="90" y1="20" x2="90" y2="28" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="90" y1="36" x2="90" y2="44" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.4" />
        <circle cx="90" cy="20" r="1.25" fill="#06b6d4" fillOpacity="0.55" />
        <circle cx="90" cy="44" r="1.25" fill="#06b6d4" fillOpacity="0.55" />

        {/* MICROCHIP 2 */}
        <rect x="126" y="25" width="18" height="14" rx="2" stroke="#06b6d4" strokeWidth="0.7" strokeOpacity="0.55" fill="#06b6d4" fillOpacity="0.02" />
        <line x1="90" y1="32" x2="126" y2="32" stroke="#06b6d4" strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="144" y1="29" x2="180" y2="29" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="144" y1="35" x2="180" y2="35" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="130" y1="29" x2="140" y2="29" stroke="#06b6d4" strokeWidth="0.3" strokeOpacity="0.3" />
        <line x1="130" y1="32" x2="140" y2="32" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.4" />
        <line x1="130" y1="35" x2="140" y2="35" stroke="#06b6d4" strokeWidth="0.3" strokeOpacity="0.3" />

        {/* NODE CLUSTER 2 */}
        <circle cx="180" cy="32" r="3" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.4" fill="none" />
        <circle cx="180" cy="32" r="1" fill="#06b6d4" fillOpacity="0.55">
          <animate attributeName="fillOpacity" values="0.55;0.25;0.55" dur="3.5s" begin="1s" repeatCount="indefinite" />
        </circle>
        <path d="M183 32 L200 32 L210 26 L360 26" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.3" strokeLinecap="round" />
        <path d="M183 32 L200 32 L210 38 L360 38" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.3" strokeLinecap="round" />
        <line x1="180" y1="14" x2="180" y2="29" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.3" />
        <line x1="180" y1="35" x2="180" y2="50" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.3" />
        <circle cx="180" cy="14" r="1.5" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.35" fill="none" />
        <circle cx="180" cy="50" r="1.5" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.35" fill="none" />

        {/* CAPACITOR SYMBOLS */}
        <line x1="250" y1="11" x2="250" y2="17" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.3" />
        <line x1="246" y1="11" x2="254" y2="11" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.3" />
        <line x1="246" y1="13" x2="254" y2="13" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.3" />
        <line x1="280" y1="47" x2="280" y2="53" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.25" />
        <line x1="276" y1="47" x2="284" y2="47" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.25" />
        <line x1="276" y1="49" x2="284" y2="49" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.25" />

        {/* NODE CLUSTER 3 */}
        <circle cx="300" cy="32" r="3.5" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.3" fill="none" />
        <circle cx="300" cy="32" r="1.25" fill="#06b6d4" fillOpacity="0.35" />
        <line x1="300" y1="26" x2="300" y2="28" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.25" />
        <line x1="300" y1="36" x2="300" y2="38" stroke="#06b6d4" strokeWidth="0.4" strokeOpacity="0.25" />
        <circle cx="300" cy="26" r="1" fill="#06b6d4" fillOpacity="0.3" />
        <circle cx="300" cy="38" r="1" fill="#06b6d4" fillOpacity="0.3" />

        {/* GHOST ELEMENTS */}
        <circle cx="420" cy="32" r="2.5" stroke="#06b6d4" strokeWidth="0.3" strokeOpacity="0.2" fill="none" />
        <circle cx="420" cy="32" r="0.8" fill="#06b6d4" fillOpacity="0.22" />
        <circle cx="400" cy="14" r="1.5" stroke="#06b6d4" strokeWidth="0.3" strokeOpacity="0.15" fill="none" />
        <circle cx="400" cy="50" r="1.5" stroke="#06b6d4" strokeWidth="0.3" strokeOpacity="0.12" fill="none" />

        <circle cx="540" cy="32" r="2" stroke="#06b6d4" strokeWidth="0.25" strokeOpacity="0.12" fill="none" />
        <circle cx="540" cy="32" r="0.6" fill="#06b6d4" fillOpacity="0.14" />
        <circle cx="520" cy="14" r="1" fill="#06b6d4" fillOpacity="0.07" />
        <circle cx="520" cy="50" r="1" fill="#06b6d4" fillOpacity="0.06" />

        <circle cx="660" cy="32" r="1.5" stroke="#06b6d4" strokeWidth="0.2" strokeOpacity="0.07" fill="none" />
        <circle cx="660" cy="32" r="0.5" fill="#06b6d4" fillOpacity="0.08" />
      </svg>
    </div>
  );
});
