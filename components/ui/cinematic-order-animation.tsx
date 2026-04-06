"use client";

import { useState, useEffect } from "react";

const MSGS = [
  { f: "c", t: "Oi! Quero fazer um pedido \u{1F354}" },
  { f: "b", t: "Ol\u00E1! Bem-vindo ao Burguer da Vila!" },
  { f: "c", t: "2 Smash Burguer e 1 Batata" },
  { f: "b", t: "Adicionei ao carrinho \u2705" },
  { f: "b", t: "Total: R$ 72,70 \u00B7 PIX gerado!" },
  { f: "c", t: "Pago \u2705" },
  { f: "b", t: "Pedido #247 confirmado! \u{1F6F5} 35min" },
];

// Fewer sparkles, smaller sizes
const SPARKLES = [
  { a: 0, d: 65, s: 2, t: 0 }, { a: 60, d: 75, s: 1.8, t: .04 },
  { a: 120, d: 70, s: 2, t: .08 }, { a: 180, d: 72, s: 1.8, t: .02 },
  { a: 240, d: 68, s: 2, t: .06 }, { a: 300, d: 74, s: 1.8, t: .05 },
  { a: 30, d: 60, s: 1.5, t: .10 }, { a: 150, d: 66, s: 1.5, t: .07 },
];

// Fewer, thinner rays
const EXPLODE_RAYS = Array.from({ length: 20 }, (_, i) => ({
  angle: (i / 20) * 360,
  thick: i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : .5,
  len: i % 5 === 0 ? 70 : i % 3 === 0 ? 50 : 35,
  delay: (i % 6) * .012,
  bright: i % 5 === 0,
}));

// Fewer, subtler particles
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  x: 12 + (i * 11) % 76,
  y: 10 + (i * 13) % 80,
  size: 1.2 + (i % 2),
  delay: i * .9,
  op: .04 + (i % 3) * .02,
}));

// Fewer, calmer speed lines
const SPEED_LINES = Array.from({ length: 12 }, (_, i) => ({
  y: -36 + (i * 6) % 72,
  len: 20 + (i % 4) * 15,
  thick: i % 5 === 0 ? 1.5 : i % 3 === 0 ? .8 : .4,
  speed: .4 + (i % 3) * .2,
  phase: (i * 41) % 220,
  op: i % 5 === 0 ? .3 : i % 3 === 0 ? .15 : .07,
  bright: i % 5 === 0,
}));

const Z_SHAPE = "M 68 58 L 212 58 L 212 90 L 122 190 L 212 190 L 212 222 L 68 222 L 68 190 L 158 90 L 68 90 Z";
const Z_STROKE = "M 68 74 L 212 74 L 68 206 L 212 206";
const BOLT = "M 125 55 L 162 55 L 146 128 L 170 128 L 125 240 L 138 162 L 114 162 Z";
const BOLT_CORE = "M 140 80 L 148 128 L 156 128 L 134 210";

function DeliveryMoto({ progress, visible }: { progress: number; visible: boolean }) {
  const fade = Math.max(0, Math.min(1, (progress - .83) / .06));
  const op = visible ? fade : 0;
  if (op <= 0) return null;
  const t = (progress - .83) * 80, wA = t * 100, bounce = Math.sin(t * 4) * .5, tilt = Math.sin(t * 2) * .1, roadS = (t * 35) % 18;
  const S = "#22364a";
  const D = "#1e3040";
  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 250, zIndex: 15, pointerEvents: "none", opacity: op }}>
      <svg viewBox="0 0 210 140" width="500" height="250" fill="none" style={{ overflow: "visible" }}>
        <defs><filter id="mGl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {SPEED_LINES.map((sl, i) => { const scroll = ((t * sl.speed * 30) + sl.phase) % 300, x = 210 - scroll; return <line key={`s${i}`} x1={x - sl.len} y1={70 + sl.y * .42} x2={x} y2={70 + sl.y * .42} stroke={sl.bright ? "#67e8f9" : "#22d3ee"} strokeWidth={sl.thick * .45} strokeLinecap="round" opacity={sl.op * op} filter={sl.bright ? "url(#mGl)" : undefined} />; })}
        <g opacity={.12 * op}><line x1="-10" y1="128" x2="220" y2="128" stroke="#22d3ee" strokeWidth="0.3" />{Array.from({ length: 20 }).map((_, i) => { const x = -5 + (i * 14) - roadS; return <line key={`r${i}`} x1={x} y1="128" x2={x + 6} y2="128" stroke="#22d3ee" strokeWidth=".6" strokeLinecap="round" />; })}</g>
        <g style={{ transform: `translateY(${bounce}px) rotate(${tilt}deg)`, transformOrigin: "105px 85px" }}>
          <circle cx="48" cy="110" r="18" fill="#0c1418" /><circle cx="48" cy="110" r="18" fill="none" stroke={S} strokeWidth="3.5" /><circle cx="48" cy="110" r="12" fill="none" stroke={S} strokeWidth="1" opacity=".4" />
          <g style={{ transformOrigin: "48px 110px", transform: `rotate(${wA}deg)` }}>{[0, 72, 144, 216, 288].map(a => <line key={a} x1={48 + Math.cos(a * Math.PI / 180) * 5} y1={110 + Math.sin(a * Math.PI / 180) * 5} x2={48 + Math.cos(a * Math.PI / 180) * 12} y2={110 + Math.sin(a * Math.PI / 180) * 12} stroke={S} strokeWidth=".7" opacity=".35" />)}</g>
          <circle cx="48" cy="110" r="3.5" fill={S} />
          <circle cx="162" cy="110" r="18" fill="#0c1418" /><circle cx="162" cy="110" r="18" fill="none" stroke={S} strokeWidth="3.5" /><circle cx="162" cy="110" r="12" fill="none" stroke={S} strokeWidth="1" opacity=".4" />
          <g style={{ transformOrigin: "162px 110px", transform: `rotate(${wA}deg)` }}>{[0, 72, 144, 216, 288].map(a => <line key={a} x1={162 + Math.cos(a * Math.PI / 180) * 5} y1={110 + Math.sin(a * Math.PI / 180) * 5} x2={162 + Math.cos(a * Math.PI / 180) * 12} y2={110 + Math.sin(a * Math.PI / 180) * 12} stroke={S} strokeWidth=".7" opacity=".35" />)}</g>
          <circle cx="162" cy="110" r="3.5" fill={S} />
          <path d="M 28 112 Q 28 86 48 82 Q 68 86 68 112 Z" fill={S} />
          <path d="M 140 112 Q 140 84 162 80 Q 184 84 184 112 Z" fill={S} />
          <rect x="38" y="72" width="32" height="14" rx="2" fill={S} />
          <rect x="32" y="68" width="40" height="6" rx="1" fill={S} />
          <path d="M 58 88 L 62 72 L 70 68 Q 82 60 95 62 Q 108 58 118 62 L 122 68 L 122 82 L 140 82 L 142 76 Q 148 66 155 60 L 160 62 L 162 96 L 58 96 Z" fill={S} />
          <path d="M 72 68 Q 82 52 100 55 Q 112 54 118 62 L 122 68 Z" fill={S} />
          <path d="M 42 96 Q 32 98 24 96 L 20 93" stroke={S} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M 155 56 L 158 50 L 164 50 L 164 92 L 158 92 Z" fill={S} />
          <path d="M 153 50 L 156 34 L 162 34 L 160 50 Z" fill={S} />
          <circle cx="159" cy="32" r="2.5" fill={S} />
          <ellipse cx="166" cy="66" rx="4" ry="5" fill={S} />
          <ellipse cx="167" cy="66" rx="2" ry="3" fill="#fbbf24" opacity=".2" />
          <rect x="22" y="28" width="42" height="42" rx="3" fill={S} />
          <line x1="24" y1="38" x2="62" y2="38" stroke="#0c1418" strokeWidth=".8" opacity=".5" />
          <text x="43" y="60" textAnchor="middle" fontFamily="monospace" fontSize="18" fontWeight="900" fill="#22d3ee" opacity=".45">Z</text>
          <ellipse cx="108" cy="26" rx="11" ry="13" fill={S} />
          <path d="M 114 22 Q 119 24 120 28 Q 118 30 116 30" fill="#0c1418" opacity=".6" />
          <path d="M 100 38 Q 96 48 94 58 L 92 65 L 118 65 L 122 58 Q 118 48 115 40 L 112 35 Q 108 32 103 35 Z" fill={S} />
          <path d="M 100 38 Q 88 42 82 50 Q 78 56 76 62 L 72 68 L 80 68 Q 84 62 88 56 Q 92 50 98 44 Z" fill={S} />
          <path d="M 115 38 Q 125 36 135 38 Q 145 40 152 42 L 155 48 L 152 52 Q 142 48 132 46 Q 122 44 116 44 Z" fill={S} />
          <path d="M 98 62 Q 102 75 108 84 L 118 88 L 138 86 L 138 82 L 120 82 L 108 78 Q 102 70 96 66 Z" fill={S} />
          <path d="M 132 82 L 142 82 L 142 88 L 136 88 Z" fill={S} />
          <path d="M 94 64 Q 88 76 85 86 L 92 90 L 100 86 Q 96 76 96 66 Z" fill={D} opacity=".7" />
          {[0, 1, 2].map(i => { const px = 16 - i * 6 - ((t * 8) % 8); return <circle key={`e${i}`} cx={px} cy={94 - i} r={1.2 + i * .6} fill="none" stroke="rgba(34,211,238,0.06)" strokeWidth=".5" opacity={Math.max(0, .15 - i * .05) * op} />; })}
        </g>
      </svg>
    </div>
  );
}

export function CinematicOrderAnimation() {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    let raf: number;
    let t0 = performance.now() + 400;
    let pausing = false;
    let pauseT = 0;
    const DUR = 12500; // slower overall pace
    const PAUSE = 2000;
    const tick = (now: number) => {
      if (pausing) {
        if (now - pauseT >= PAUSE) { pausing = false; t0 = now; setProgress(0); }
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, Math.max(0, (now - t0) / DUR));
      setProgress(p);
      if (p >= 1) { pausing = true; pauseT = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  const p = progress;
  const sl = .30 / MSGS.length;
  const nVis = Math.min(MSGS.length, p > .01 ? Math.floor(p / sl) + 1 : 0);

  // Gentler chat transitions
  const chatDY = p < .32 ? -p * 30 : -10;
  const chatZm = p < .32 ? .97 + p * .1 : 1;
  const chatOp = p < .32 ? 1 : p < .42 ? 1 - (p - .32) / .10 : 0;
  const chatBl = p < .32 ? 0 : p < .42 ? ((p - .32) / .10) * 12 : 12;

  const zDraw = Math.max(0, Math.min(1, (p - .42) / .10));
  const zFillOp = Math.max(0, Math.min(1, (p - .52) / .05));
  const zVis = p >= .42 && p < .70;

  // Gentler spin — less shrink, less scale
  const spnR = Math.max(0, Math.min(1, (p - .54) / .14));
  const spnE = 1 - Math.pow(1 - spnR, 3);
  const zShr = 1 - spnR * .7;
  const zScl = 1 + spnR * .2;

  const zOpF = p < .65 ? 1 : Math.max(0, 1 - (p - .65) / .05);
  const zTrOp = p < .54 ? 1 : Math.max(0, 1 - (p - .54) / .08);
  const spkOn = p > .56 && p < .72;

  const bApp = Math.max(0, Math.min(1, (p - .68) / .05));
  const bSet = p >= .80 ? .4 + .6 * Math.max(0, 1 - (p - .80) / .10) : 1;
  const bScl = .7 + bApp * .3;
  const boltVis = bApp > 0 && p < .88;

  // Subtler flash
  const flI = p >= .68 && p <= .80 ? (p < .72 ? (p - .68) / .04 : 1 - (p - .72) / .08) : 0;
  const flReduced = flI * .5; // halve flash intensity

  // Subtler rays
  const ryP = Math.max(0, Math.min(1, (p - .70) / .16));
  const ryF = ryP > .4 ? Math.max(0, 1 - (ryP - .4) / .6) : 1;

  const CX = 140, CY = 140;

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
      {/* Floating particles */}
      {PARTICLES.map((pt, i) => (
        <div key={i} style={{
          position: "absolute", left: `${pt.x}%`, top: `${pt.y}%`,
          width: pt.size, height: pt.size, borderRadius: "50%",
          background: `rgba(34,211,238,${pt.op})`,
          transform: `translateY(${Math.sin((p * 14 + pt.delay) * .5) * 4}px)`,
          zIndex: 2,
        }} />
      ))}

      {/* Chat window — less aggressive perspective tilt */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", zIndex: 3, width: 250,
        transform: `translate(-50%,-50%) perspective(1000px) rotateY(-8deg) rotateX(4deg) rotateZ(-1deg) translateY(${chatDY}px) scale(${chatZm})`,
        transformStyle: "preserve-3d",
        opacity: chatOp,
        filter: `blur(${chatBl}px)`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 12px", borderRadius: "12px 12px 0 0",
          border: "1px solid rgba(34,211,238,0.08)", borderBottom: "none",
          background: "rgba(34,211,238,0.04)",
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "linear-gradient(135deg,#22d3ee,#0891b2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
          }}>{"\u{1F354}"}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#e4e4e7" }}>Burguer da Vila</div>
            <div style={{ fontSize: 8, color: "#22d3ee", fontWeight: 500 }}>online</div>
          </div>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", gap: 4,
          padding: "10px 8px", minHeight: 210,
          borderRadius: "0 0 12px 12px",
          border: "1px solid rgba(63,63,70,0.18)", borderTop: "none",
          background: "rgba(24,24,27,0.72)", backdropFilter: "blur(8px)",
        }}>
          {MSGS.map((m, i) => {
            const bot = m.f === "b";
            const vis = i < nVis;
            return (
              <div key={i} style={{
                alignSelf: bot ? "flex-start" : "flex-end",
                maxWidth: "82%", padding: "6px 10px",
                borderRadius: bot ? "3px 10px 10px 10px" : "10px 3px 10px 10px",
                background: bot ? "rgba(39,39,42,0.85)" : "linear-gradient(135deg,#22d3ee,#0891b2)",
                color: bot ? "#d4d4d8" : "#fff",
                fontSize: 10.5, lineHeight: 1.4, fontWeight: bot ? 400 : 500,
                border: bot ? "1px solid rgba(63,63,70,0.3)" : "none",
                boxShadow: bot ? "none" : "0 1px 6px rgba(34,211,238,0.08)",
                opacity: vis ? 1 : 0,
                transform: vis ? "translate3d(0,0,0) scale(1)" : `translate3d(${bot ? -8 : 8}px,6px,0) scale(0.95)`,
                transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
              }}>{m.t}</div>
            );
          })}
        </div>
      </div>

      {/* Z + Bolt SVG */}
      <svg style={{
        position: "absolute", top: "50%", left: "50%",
        width: 300, height: 300,
        transform: `translate(-50%,-50%) scale(${zVis ? zScl : 1})`,
        zIndex: 6, overflow: "visible",
      }} viewBox="0 0 280 280" fill="none">
        <defs>
          <filter id="trGl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="trBl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /></feMerge></filter>
          <filter id="spGl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="flBl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b" /><feMerge><feMergeNode in="b" /></feMerge></filter>
          <filter id="btGl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="btBl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /></feMerge></filter>
          <linearGradient id="zF" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#67e8f9" /><stop offset="40%" stopColor="#22d3ee" /><stop offset="70%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#0891b2" /></linearGradient>
          <linearGradient id="zH" x1=".3" y1="0" x2=".7" y2="1"><stop offset="0%" stopColor="white" stopOpacity=".35" /><stop offset="30%" stopColor="white" stopOpacity=".08" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient>
          <linearGradient id="zE" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".5" /><stop offset="100%" stopColor="#0e7490" stopOpacity=".25" /></linearGradient>
          <linearGradient id="bF" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#67e8f9" /><stop offset="40%" stopColor="#22d3ee" /><stop offset="70%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#0891b2" /></linearGradient>
          <linearGradient id="bH" x1=".3" y1="0" x2=".7" y2="1"><stop offset="0%" stopColor="white" stopOpacity=".4" /><stop offset="30%" stopColor="white" stopOpacity=".1" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient>
          <linearGradient id="bE" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".6" /><stop offset="100%" stopColor="#0e7490" stopOpacity=".3" /></linearGradient>
        </defs>

        {/* Z letter */}
        {zVis && (
          <g style={{ transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${spnE * 360}deg) scale(${zShr})`, opacity: zOpF }}>
            {zTrOp > 0 && (
              <>
                <path d={Z_STROKE} stroke="#06b6d4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" filter="url(#trBl)" opacity={.15 * zDraw * zTrOp} strokeDasharray="520" strokeDashoffset={520 * (1 - zDraw)} />
                <path d={Z_STROKE} stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity={.5 * zDraw * zTrOp} strokeDasharray="520" strokeDashoffset={520 * (1 - zDraw)} />
                {zDraw > 0 && zDraw < 1 && <path d={Z_STROKE} stroke="#e0f9ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" filter="url(#trGl)" opacity={.8 * zTrOp} strokeDasharray="35 485" strokeDashoffset={520 * (1 - zDraw)} />}
              </>
            )}
            {zFillOp > 0 && (
              <>
                <path d={Z_SHAPE} fill="#22d3ee" filter="url(#btBl)" opacity={.15 * zFillOp} />
                <path d={Z_SHAPE} fill="url(#zF)" filter="url(#btGl)" opacity={zFillOp * .9} />
                <path d={Z_SHAPE} fill="url(#zH)" opacity={.25 * zFillOp} />
                <path d={Z_SHAPE} fill="none" stroke="url(#zE)" strokeWidth="1" strokeLinejoin="round" opacity={.4 * zFillOp} />
              </>
            )}
          </g>
        )}

        {/* Sparkles — fewer, smaller, less glow */}
        {spkOn && SPARKLES.map((sp, i) => {
          const pp = Math.max(0, Math.min(1, (p - .56 - sp.t) / .14));
          const ee = 1 - Math.pow(1 - pp, 2);
          const rad = (sp.a * Math.PI) / 180;
          const d = sp.d * ee;
          const x = CX + Math.cos(rad) * d;
          const y = CY + Math.sin(rad) * d;
          const op2 = pp < .2 ? pp / .2 : Math.max(0, 1 - (pp - .2) / .8);
          const c1 = i % 2 === 0 ? "#22d3ee" : "#67e8f9";
          return (
            <g key={i} opacity={op2 * .6}>
              <line x1={x} y1={y - sp.s * 1.5} x2={x} y2={y + sp.s * 1.5} stroke={c1} strokeWidth={sp.s * .35} strokeLinecap="round" filter="url(#spGl)" />
              <line x1={x - sp.s * 1.5} y1={y} x2={x + sp.s * 1.5} y2={y} stroke={c1} strokeWidth={sp.s * .35} strokeLinecap="round" filter="url(#spGl)" />
              <circle cx={x} cy={y} r={sp.s * .25} fill="white" opacity=".6" />
            </g>
          );
        })}

        {/* Flash — reduced intensity */}
        {flReduced > 0 && (
          <>
            <circle cx={CX} cy={CY} r={5 + (1 - flReduced) * 80} fill="white" filter="url(#flBl)" opacity={flReduced * .5} />
            <circle cx={CX} cy={CY} r={10 + (1 - flReduced) * 100} fill="none" stroke="#22d3ee" strokeWidth={1.5 * flReduced} filter="url(#btGl)" opacity={flReduced * .3} />
          </>
        )}

        {/* Bolt */}
        {boltVis && bApp > 0 && (
          <g opacity={bApp * bSet} style={{ transformOrigin: `${CX}px ${CY}px`, transform: `scale(${bScl})` }}>
            <path d={BOLT} fill="#22d3ee" filter="url(#btBl)" opacity={bSet < .5 ? .04 : .15 * bSet} />
            <path d={BOLT} fill="url(#bF)" filter="url(#btGl)" />
            <path d={BOLT} fill="url(#bH)" opacity={.25 + flReduced * .3} />
            <path d={BOLT} fill="none" stroke="url(#bE)" strokeWidth="1" strokeLinejoin="round" opacity={.25 + flReduced * .4} />
            <path d={BOLT_CORE} stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={.1 + flReduced * .6} />
          </g>
        )}
      </svg>

      {/* Explode rays — fewer, subtler */}
      {ryP > 0 && ryF > 0 && (
        <div style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none" }}>
          {EXPLODE_RAYS.map((r, i) => {
            const rp = Math.max(0, Math.min(1, (ryP - r.delay) / .7));
            const re = 1 - Math.pow(1 - rp, 2.5);
            return (
              <div key={i} style={{
                position: "absolute", top: "50%", left: "50%",
                width: `${re * r.len}%`, height: r.thick,
                background: `linear-gradient(90deg,${r.bright ? "rgba(255,255,255,0.6)" : "rgba(34,211,238,0.5)"},${r.bright ? "rgba(34,211,238,0.3)" : "rgba(8,145,178,0.2)"} 30%,transparent 80%)`,
                transformOrigin: "0% 50%",
                transform: `rotate(${r.angle}deg)`,
                opacity: ryF * (r.bright ? .45 : i % 3 === 0 ? .25 : .1),
                borderRadius: 2,
              }} />
            );
          })}
        </div>
      )}

      {/* Flash overlay — much subtler */}
      {flReduced > 0 && <div style={{ position: "absolute", inset: 0, zIndex: 12, pointerEvents: "none", background: `radial-gradient(circle at 50% 50%,rgba(255,255,255,${flReduced * .4}),rgba(34,211,238,${flReduced * .1}) 35%,transparent 65%)` }} />}

      {/* Delivery moto */}
      <DeliveryMoto progress={p} visible={p >= .83} />
    </div>
  );
}
