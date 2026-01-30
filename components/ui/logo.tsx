import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
}

export function Logo({ className = "", collapsed = false }: LogoProps) {
  return (
    // Gap removido (gap-0) e itens alinhados pelo centro
    <div className={`flex items-center gap-0 ${className}`}>
      
      {/* ÍCONE Z 
         -mr-2: Margem negativa para a direita. Isso puxa o texto "enBot" para mais perto do ícone.
         Se ainda ficar longe, aumente para -mr-3 ou -mr-4.
      */}
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

      {/* TEXTO RESTANTE ("enBotZ") */}
      {!collapsed && (
        <div className="flex flex-col justify-center select-none pt-1">
          <span className="font-heading font-extrabold text-3xl leading-none tracking-tight">
            {/* Texto cinza claro, colado no ícone */}
            <span className="text-slate-300">enBot</span>
            <span className="text-sky-500">Z</span>
          </span>
        </div>
      )}
    </div>
  );
}