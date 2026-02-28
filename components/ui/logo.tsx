import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
}

export function Logo({ className = "", collapsed = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-0 ${className}`}>

      {/* Icon */}
      <div className="relative w-14 h-14 flex items-center justify-center shrink-0 -mr-2">
        <Image
          src="/logo-zenbotz.png"
          alt="ZenBotZ Logo"
          width={56}
          height={56}
          className="object-contain drop-shadow-md"
          priority
        />
      </div>

      {/* Wordmark — Space Grotesk for tech/circuit aesthetic */}
      {!collapsed && (
        <div className="flex flex-col justify-center select-none pt-1">
          <span className="font-logo font-bold text-[1.65rem] leading-none tracking-[-0.02em]">
            <span className="text-slate-200">en</span>
            <span className="text-white">Bot</span>
            <span
              className="text-cyan-400 font-extrabold"
              style={{
                textShadow: "0 0 8px rgba(34,211,238,0.4), 0 0 20px rgba(6,182,212,0.15)",
              }}
            >
              Z
            </span>
          </span>
          <span className="font-logo text-[0.55rem] tracking-[0.32em] text-slate-500 uppercase ml-[1px]">
            AI Delivery
          </span>
        </div>
      )}
    </div>
  );
}
