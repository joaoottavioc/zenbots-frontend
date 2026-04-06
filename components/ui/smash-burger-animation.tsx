"use client";

import { useEffect, useState } from "react";

/**
 * Night cityscape silhouette — abstract São Paulo Zona Sul skyline
 */
function NightSkyline() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 500 400"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0f" />
          <stop offset="60%" stopColor="#0f1623" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
      </defs>
      <rect width="500" height="400" fill="url(#nightSky)" />

      {/* Stars */}
      <circle cx="45" cy="35" r="1" fill="white" opacity="0.5" />
      <circle cx="120" cy="60" r="0.8" fill="white" opacity="0.3" />
      <circle cx="200" cy="25" r="1.2" fill="white" opacity="0.4" />
      <circle cx="310" cy="50" r="0.7" fill="white" opacity="0.35" />
      <circle cx="400" cy="30" r="1" fill="white" opacity="0.45" />
      <circle cx="460" cy="70" r="0.6" fill="white" opacity="0.3" />
      <circle cx="80" cy="80" r="0.5" fill="white" opacity="0.25" />
      <circle cx="350" cy="20" r="0.9" fill="white" opacity="0.4" />

      {/* Buildings — back layer (tallest, faintest) */}
      <rect x="30" y="200" width="28" height="200" fill="#111318" />
      <rect x="70" y="160" width="22" height="240" fill="#0d1017" />
      <rect x="130" y="180" width="35" height="220" fill="#111318" />
      <rect x="190" y="140" width="20" height="260" fill="#0d1017" />
      <rect x="230" y="170" width="30" height="230" fill="#111318" />
      <rect x="300" y="150" width="25" height="250" fill="#0d1017" />
      <rect x="340" y="190" width="32" height="210" fill="#111318" />
      <rect x="400" y="165" width="22" height="235" fill="#0d1017" />
      <rect x="440" y="185" width="28" height="215" fill="#111318" />

      {/* Buildings — front layer (shorter, slightly lighter) */}
      <rect x="15" y="260" width="40" height="140" fill="#16181f" />
      <rect x="58" y="240" width="35" height="160" fill="#1a1d26" />
      <rect x="105" y="270" width="30" height="130" fill="#16181f" />
      <rect x="155" y="250" width="40" height="150" fill="#1a1d26" />
      <rect x="210" y="265" width="25" height="135" fill="#16181f" />
      <rect x="270" y="245" width="38" height="155" fill="#1a1d26" />
      <rect x="320" y="275" width="28" height="125" fill="#16181f" />
      <rect x="370" y="255" width="35" height="145" fill="#1a1d26" />
      <rect x="420" y="260" width="40" height="140" fill="#16181f" />
      <rect x="470" y="270" width="30" height="130" fill="#1a1d26" />

      {/* Window lights — scattered across buildings */}
      {/* Back buildings */}
      <rect x="75" y="172" width="3" height="3" fill="#22d3ee" opacity="0.15" />
      <rect x="82" y="185" width="3" height="3" fill="#fbbf24" opacity="0.12" />
      <rect x="195" y="155" width="3" height="3" fill="#22d3ee" opacity="0.12" />
      <rect x="195" y="175" width="3" height="3" fill="#fbbf24" opacity="0.1" />
      <rect x="140" y="195" width="3" height="3" fill="#22d3ee" opacity="0.13" />
      <rect x="150" y="210" width="3" height="3" fill="#fbbf24" opacity="0.1" />
      <rect x="305" y="165" width="3" height="3" fill="#22d3ee" opacity="0.12" />
      <rect x="315" y="185" width="3" height="3" fill="#fbbf24" opacity="0.1" />
      <rect x="235" y="185" width="3" height="3" fill="#22d3ee" opacity="0.14" />
      <rect x="245" y="200" width="3" height="3" fill="#fbbf24" opacity="0.1" />
      <rect x="405" y="178" width="3" height="3" fill="#22d3ee" opacity="0.12" />
      <rect x="345" y="205" width="3" height="3" fill="#fbbf24" opacity="0.11" />

      {/* Front buildings */}
      <rect x="25" y="275" width="3" height="4" fill="#fbbf24" opacity="0.2" />
      <rect x="35" y="290" width="3" height="4" fill="#22d3ee" opacity="0.15" />
      <rect x="65" y="255" width="3" height="4" fill="#fbbf24" opacity="0.18" />
      <rect x="75" y="270" width="3" height="4" fill="#22d3ee" opacity="0.15" />
      <rect x="165" y="265" width="3" height="4" fill="#fbbf24" opacity="0.2" />
      <rect x="175" y="280" width="3" height="4" fill="#22d3ee" opacity="0.15" />
      <rect x="280" y="260" width="3" height="4" fill="#fbbf24" opacity="0.18" />
      <rect x="290" y="275" width="3" height="4" fill="#22d3ee" opacity="0.14" />
      <rect x="380" y="268" width="3" height="4" fill="#fbbf24" opacity="0.2" />
      <rect x="390" y="285" width="3" height="4" fill="#22d3ee" opacity="0.15" />
      <rect x="430" y="275" width="3" height="4" fill="#fbbf24" opacity="0.18" />
      <rect x="440" y="290" width="3" height="4" fill="#22d3ee" opacity="0.14" />
    </svg>
  );
}

/**
 * Z → spin 360° (with sparkles bursting out) → morphs into ⚡ bolt
 * → flash + aura → settles.
 *
 * Uses a single continuous progress value (0→1) driven by
 * requestAnimationFrame so there are no discrete jumps.
 */
function ZTrail({ started }: { started: boolean }) {
  const [progress, setProgress] = useState(0);
  // progress 0.00–0.30 = ray draws Z
  // progress 0.30–0.70 = Z spins 360° + shrinks, sparkles burst
  // progress 0.70–0.85 = flash + bolt appears
  // progress 0.85–1.00 = settle

  useEffect(() => {
    if (!started) return;
    const duration = 4200; // total ms
    const startTime = performance.now() + 200; // small initial delay
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1, Math.max(0, elapsed / duration));
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  const zPath = "M 215 165 L 290 165 L 210 265 L 285 265";
  const boltShape =
    "M 240 135 L 270 135 L 255 195 L 275 195 L 238 295 L 248 225 L 228 225 Z";

  // Derived animation values — all continuous, no steps
  const rayDraw = Math.min(1, progress / 0.30); // 0→1 during first 30%
  const spinAmount = Math.max(0, Math.min(1, (progress - 0.28) / 0.42)); // 0→1 during 28%–70%
  const spinEased = spinAmount < 1
    ? 1 - Math.pow(1 - spinAmount, 3) // ease-out cubic
    : 1;
  const shrink = 1 - spinAmount * 0.85; // scale 1 → 0.15
  const zOpacity = progress < 0.65 ? 1 : Math.max(0, 1 - (progress - 0.65) / 0.08);
  const boltAppear = Math.max(0, Math.min(1, (progress - 0.68) / 0.06));
  const flashIntensity = progress >= 0.68 && progress <= 0.85
    ? 1 - (progress - 0.68) / 0.17
    : 0;
  const boltSettle = progress >= 0.85
    ? 0.35 + 0.65 * Math.max(0, 1 - (progress - 0.85) / 0.15)
    : 1;

  // Sparkle particles — burst outward during the spin
  const sparkleActive = progress > 0.32 && progress < 0.78;
  const sparkles = [
    { angle: 0, dist: 60, size: 3, delay: 0 },
    { angle: 45, dist: 75, size: 2.5, delay: 0.05 },
    { angle: 90, dist: 55, size: 2, delay: 0.1 },
    { angle: 135, dist: 70, size: 3, delay: 0.03 },
    { angle: 180, dist: 65, size: 2, delay: 0.08 },
    { angle: 225, dist: 80, size: 2.5, delay: 0.02 },
    { angle: 270, dist: 50, size: 3, delay: 0.12 },
    { angle: 315, dist: 72, size: 2, delay: 0.06 },
    { angle: 22, dist: 58, size: 1.5, delay: 0.15 },
    { angle: 160, dist: 68, size: 1.5, delay: 0.09 },
    { angle: 200, dist: 62, size: 2, delay: 0.11 },
    { angle: 290, dist: 75, size: 1.5, delay: 0.04 },
  ];

  const cx = 250, cy = 215; // center

  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 500 400"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <defs>
          <filter id="rayGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="rayBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
          <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="boltGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="boltBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
          <filter id="flashBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
          <linearGradient id="boltFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="40%" stopColor="#22d3ee" />
            <stop offset="70%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="boltHighlight" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="30%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="boltEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* ═══ Z LAYER — draws, spins, shrinks ═══ */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${spinEased * 360}deg) scale(${shrink})`,
            opacity: zOpacity,
          }}
        >
          {/* Z bloom */}
          <path
            d={zPath} stroke="#06b6d4" strokeWidth="10"
            strokeLinecap="round" strokeLinejoin="round"
            filter="url(#rayBloom)"
            opacity={0.15 * rayDraw}
            strokeDasharray="380"
            strokeDashoffset={380 * (1 - rayDraw)}
          />
          {/* Z trace */}
          <path
            d={zPath} stroke="#22d3ee" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round"
            opacity={0.45 * rayDraw}
            strokeDasharray="380"
            strokeDashoffset={380 * (1 - rayDraw)}
          />
          {/* Racing ray — bright short segment */}
          {progress < 0.35 && (
            <path
              d={zPath} stroke="#e0f9ff" strokeWidth="5"
              strokeLinecap="round" strokeLinejoin="round"
              filter="url(#rayGlow)"
              opacity={0.9}
              strokeDasharray="30 350"
              strokeDashoffset={380 * (1 - rayDraw)}
            />
          )}
        </g>

        {/* ═══ SPARKLES — burst outward during the spin ═══ */}
        {sparkleActive && sparkles.map((s, i) => {
          const sparkProgress = Math.max(0, Math.min(1,
            (progress - 0.32 - s.delay) / 0.35
          ));
          const eased = 1 - Math.pow(1 - sparkProgress, 2);
          const rad = (s.angle * Math.PI) / 180;
          const dist = s.dist * eased;
          const x = cx + Math.cos(rad) * dist;
          const y = cy + Math.sin(rad) * dist;
          // Sparkles fade in then out
          const sparkOp = sparkProgress < 0.3
            ? sparkProgress / 0.3
            : Math.max(0, 1 - (sparkProgress - 0.3) / 0.7);

          return (
            <g key={i} opacity={sparkOp * 0.9}>
              {/* Star shape — 4-point sparkle */}
              <line
                x1={x} y1={y - s.size * 1.8} x2={x} y2={y + s.size * 1.8}
                stroke={i % 3 === 0 ? "#67e8f9" : i % 3 === 1 ? "#22d3ee" : "white"}
                strokeWidth={s.size * 0.4}
                strokeLinecap="round"
                filter="url(#sparkGlow)"
              />
              <line
                x1={x - s.size * 1.8} y1={y} x2={x + s.size * 1.8} y2={y}
                stroke={i % 3 === 0 ? "#67e8f9" : i % 3 === 1 ? "#22d3ee" : "white"}
                strokeWidth={s.size * 0.4}
                strokeLinecap="round"
                filter="url(#sparkGlow)"
              />
              {/* Diagonal arms — makes it a ✦ */}
              <line
                x1={x - s.size} y1={y - s.size} x2={x + s.size} y2={y + s.size}
                stroke={i % 2 === 0 ? "#06b6d4" : "#22d3ee"}
                strokeWidth={s.size * 0.25}
                strokeLinecap="round"
              />
              <line
                x1={x + s.size} y1={y - s.size} x2={x - s.size} y2={y + s.size}
                stroke={i % 2 === 0 ? "#06b6d4" : "#22d3ee"}
                strokeWidth={s.size * 0.25}
                strokeLinecap="round"
              />
              {/* Center dot */}
              <circle cx={x} cy={y} r={s.size * 0.3} fill="white" opacity="0.8" />
            </g>
          );
        })}

        {/* ═══ FLASH + AURA — at the transition moment ═══ */}
        {flashIntensity > 0 && (
          <>
            {/* White flash burst */}
            <circle cx={cx} cy={cy}
              r={5 + (1 - flashIntensity) * 85}
              fill="white" filter="url(#flashBloom)"
              opacity={flashIntensity * 0.8}
            />
            {/* Aura ring 1 */}
            <circle cx={cx} cy={cy}
              r={10 + (1 - flashIntensity) * 120}
              fill="none" stroke="#22d3ee"
              strokeWidth={2.5 * flashIntensity}
              filter="url(#boltGlow)"
              opacity={flashIntensity * 0.6}
            />
            {/* Aura ring 2 */}
            <circle cx={cx} cy={cy}
              r={10 + (1 - flashIntensity) * 85}
              fill="none" stroke="#06b6d4"
              strokeWidth={1.5 * flashIntensity}
              filter="url(#boltBloom)"
              opacity={flashIntensity * 0.35}
            />
          </>
        )}

        {/* ═══ BOLT — Pikachu-style filled shape with volume ═══ */}
        {boltAppear > 0 && (
          <g opacity={boltAppear * boltSettle}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `scale(${0.5 + boltAppear * 0.5})`,
            }}
          >
            {/* Outer bloom */}
            <path d={boltShape} fill="#22d3ee" filter="url(#boltBloom)"
              opacity={boltSettle < 0.5 ? 0.06 : 0.25 * boltSettle}
            />
            {/* Main body — gradient fill */}
            <path d={boltShape} fill="url(#boltFill)" filter="url(#boltGlow)" />
            {/* Highlight — left-edge volume */}
            <path d={boltShape} fill="url(#boltHighlight)" opacity={0.3 + flashIntensity * 0.5} />
            {/* Edge stroke */}
            <path d={boltShape} fill="none" stroke="url(#boltEdge)"
              strokeWidth="1.2" strokeLinejoin="round"
              opacity={0.3 + flashIntensity * 0.6}
            />
            {/* Hot core line */}
            <path
              d="M 253 155 L 258 195 L 264 195 L 245 275"
              stroke="white" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              fill="none" opacity={0.15 + flashIntensity * 0.85}
            />
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * The smash burger — scaled down, sitting in the foreground
 */
function SmashBurger({ started }: { started: boolean }) {
  return (
    <div className="relative flex flex-col items-center scale-[0.6] z-20">
      {/* Steam particles */}
      {started && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-4">
          <span className="block w-1.5 h-8 rounded-full bg-white/20 animate-steam-1" />
          <span className="block w-1.5 h-10 rounded-full bg-white/15 animate-steam-2" />
          <span className="block w-1.5 h-6 rounded-full bg-white/20 animate-steam-3" />
        </div>
      )}

      {/* Top bun */}
      <div
        className={`relative z-10 transition-all duration-700 ease-out ${
          started ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
        }`}
        style={{ transitionDelay: "1.8s" }}
      >
        <div className="w-44 h-16 bg-gradient-to-b from-amber-600 to-amber-700 rounded-t-full rounded-b-lg relative overflow-hidden">
          <span className="absolute top-3 left-8 w-2 h-1 bg-amber-300/80 rounded-full rotate-12" />
          <span className="absolute top-5 left-16 w-2 h-1 bg-amber-300/80 rounded-full -rotate-6" />
          <span className="absolute top-2 right-10 w-2 h-1 bg-amber-300/80 rounded-full rotate-45" />
          <span className="absolute top-6 left-24 w-2 h-1 bg-amber-300/80 rounded-full -rotate-20" />
          <span className="absolute top-4 right-16 w-2 h-1 bg-amber-300/80 rounded-full rotate-30" />
          <div className="absolute top-1 left-6 w-20 h-4 bg-white/10 rounded-full blur-sm" />
        </div>
      </div>

      {/* Lettuce */}
      <div
        className={`relative z-9 -mt-1 transition-all duration-600 ease-out ${
          started ? "translate-x-0 opacity-100" : "translate-x-20 opacity-0"
        }`}
        style={{ transitionDelay: "1.5s" }}
      >
        <svg width="180" height="18" viewBox="0 0 180 18" className="drop-shadow-sm">
          <path
            d="M4 9 Q15 2, 26 10 Q37 18, 48 8 Q59 0, 72 10 Q83 18, 95 8 Q107 0, 118 10 Q130 18, 142 8 Q154 0, 165 10 Q172 15, 176 9"
            fill="none"
            stroke="#4ade80"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Tomato slices */}
      <div
        className={`relative z-8 -mt-1 flex justify-center gap-1 transition-all duration-600 ease-out ${
          started ? "translate-x-0 opacity-100" : "-translate-x-16 opacity-0"
        }`}
        style={{ transitionDelay: "1.3s" }}
      >
        <div className="w-12 h-3 bg-red-500 rounded-full shadow-inner" />
        <div className="w-14 h-3 bg-red-600 rounded-full shadow-inner" />
        <div className="w-12 h-3 bg-red-500 rounded-full shadow-inner" />
      </div>

      {/* Melting cheese */}
      <div
        className={`relative z-7 -mt-0.5 transition-all duration-700 ease-out ${
          started ? "translate-y-0 opacity-100 scale-100" : "-translate-y-10 opacity-0 scale-75"
        }`}
        style={{ transitionDelay: "1.1s" }}
      >
        <svg width="180" height="28" viewBox="0 0 180 28">
          <path
            d="M6 2 H174 V10 Q170 10, 168 18 Q166 26, 160 26 Q154 26, 154 16 Q154 10, 148 10 H120 Q116 10, 114 20 Q112 28, 106 28 Q100 28, 100 18 Q100 10, 94 10 H60 Q56 10, 54 22 Q52 28, 46 28 Q40 28, 40 18 Q40 10, 34 10 H6 Z"
            fill="#fbbf24"
            className="drop-shadow-sm"
          />
          <path
            d="M6 2 H174 V10 Q170 10, 168 18 Q166 26, 160 26 Q154 26, 154 16 Q154 10, 148 10 H120 Q116 10, 114 20 Q112 28, 106 28 Q100 28, 100 18 Q100 10, 94 10 H60 Q56 10, 54 22 Q52 28, 46 28 Q40 28, 40 18 Q40 10, 34 10 H6 Z"
            fill="url(#cheeseShine2)"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="cheeseShine2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Smash patty */}
      <div
        className={`relative z-6 -mt-2 transition-all duration-500 ease-out ${
          started ? "translate-y-0 opacity-100 scale-x-100" : "translate-y-8 opacity-0 scale-x-50"
        }`}
        style={{ transitionDelay: "0.8s" }}
      >
        <div className="w-48 h-5 bg-gradient-to-b from-stone-700 to-stone-800 rounded-full relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-900/40 via-transparent to-amber-900/40" />
          <span className="absolute top-1 left-8 w-6 h-0.5 bg-stone-900/50 rounded-full -rotate-3" />
          <span className="absolute top-2.5 left-16 w-8 h-0.5 bg-stone-900/50 rounded-full rotate-1" />
          <span className="absolute top-1.5 right-10 w-5 h-0.5 bg-stone-900/50 rounded-full -rotate-2" />
        </div>
        {started && (
          <>
            <span className="absolute -right-2 top-1 w-1 h-1 bg-orange-400 rounded-full animate-sizzle-1" />
            <span className="absolute -left-1 top-2 w-1 h-1 bg-orange-300 rounded-full animate-sizzle-2" />
            <span className="absolute right-4 -top-1 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-sizzle-3" />
          </>
        )}
      </div>

      {/* Bottom bun */}
      <div
        className={`relative z-5 -mt-1 transition-all duration-600 ease-out ${
          started ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
        }`}
        style={{ transitionDelay: "0.5s" }}
      >
        <div className="w-46 h-8 bg-gradient-to-b from-amber-600 to-amber-700 rounded-b-2xl rounded-t-lg relative">
          <div className="absolute top-0 left-4 w-16 h-2 bg-white/10 rounded-full blur-sm" />
        </div>
      </div>

      {/* Paper wrapper */}
      <div
        className={`-mt-2 transition-all duration-500 ease-out ${
          started ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        style={{ transitionDelay: "0.3s" }}
      >
        <div className="w-56 h-6 bg-gradient-to-b from-orange-100/20 to-orange-50/10 rounded-b-xl border-b border-x border-white/10" />
      </div>
    </div>
  );
}

export { NightSkyline };

export function SmashBurgerAnimation() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none overflow-hidden">
      {/* Layer 2: Z-trail arc behind the burger */}
      <ZTrail started={started} />

      {/* Layer 3: Ambient glow — warm, centered on burger */}
      <div className="absolute w-48 h-48 rounded-full bg-orange-500/8 blur-3xl z-10" />

      {/* Layer 4: Burger in the foreground */}
      <SmashBurger started={started} />
    </div>
  );
}
