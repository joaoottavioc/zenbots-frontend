"use client";

export function CircuitBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern
            id="dot-grid"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#22d3ee" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Circuit traces */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="trace-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal traces */}
        {[120, 280, 450, 620, 800, 960].map((y, i) => (
          <g key={`h-${i}`}>
            <line
              x1="0"
              y1={y}
              x2="100%"
              y2={y}
              stroke="#22d3ee"
              strokeWidth="0.5"
              opacity="0.06"
            />
            <line
              x1="0"
              y1={y}
              x2="100%"
              y2={y}
              stroke="url(#trace-grad)"
              strokeWidth="1"
              opacity="0.15"
              strokeDasharray="200 400"
              filter="url(#glow)"
              className="animate-trace"
              style={{ animationDelay: `${i * 0.8}s` }}
            />
          </g>
        ))}

        {/* Vertical traces */}
        {[200, 500, 800, 1100, 1400].map((x, i) => (
          <g key={`v-${i}`}>
            <line
              x1={x}
              y1="0"
              x2={x}
              y2="100%"
              stroke="#22d3ee"
              strokeWidth="0.5"
              opacity="0.04"
            />
          </g>
        ))}

        {/* Circuit nodes */}
        {[
          [200, 120],
          [500, 280],
          [800, 450],
          [1100, 620],
          [1400, 280],
          [800, 800],
          [500, 960],
          [1100, 960],
        ].map(([cx, cy], i) => (
          <g key={`node-${i}`}>
            <circle
              cx={cx}
              cy={cy}
              r="3"
              fill="#22d3ee"
              opacity="0.2"
              filter="url(#glow)"
            />
            <circle
              cx={cx}
              cy={cy}
              r="6"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.5"
              opacity="0.1"
            />
          </g>
        ))}
      </svg>

      {/* Ambient glow orbs */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-cyan-500/5 animate-pulse-glow"
      />
      <div
        className="absolute top-3/4 -right-32 w-80 h-80 rounded-full bg-cyan-400/5 animate-pulse-glow"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-600/3 animate-pulse-glow"
        style={{ animationDelay: "0.5s" }}
      />
    </div>
  );
}
