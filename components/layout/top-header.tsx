"use client";

import { UserNav } from "@/components/ui/user-nav";

export function TopHeader() {
  // Definimos o SVG do circuito aqui para ficar organizado
  // Cor: %230ea5e9 é o código do azul sky-500 (o neon do seu robô)
  const circuitPattern = `data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10h10l5-5h10l5 5h20l5-5h10l5 5h20' stroke='%230ea5e9' stroke-width='1' fill='none' opacity='0.5'/%3E%3C/svg%3E`;

  return (
    // CORREÇÃO: Removido 'overflow-hidden' desta tag principal.
    // Isso permite que o modal/dropdown do UserNav ultrapasse os limites da barra.
    <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
      
      {/* --- CONTAINER DE FUNDO (ISOLADO) --- */}
      {/* Movemos o overflow-hidden para este container interno. 
          Assim, os circuitos não vazam para fora da barra, mas o UserNav não é afetado. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        
        {/* CAMADA 1: CIRCUITOS */}
        <div 
          className="absolute inset-0 z-0"
          style={{
              backgroundImage: `url("${circuitPattern}")`, 
              backgroundRepeat: "repeat",
              backgroundSize: "300px auto", 
              opacity: 0.4, 
              // Máscara para suavizar
              maskImage: "linear-gradient(to bottom, black, transparent 90%)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent 90%)"
          }}
        ></div>

        {/* CAMADA 2: REFLEXO AZUL (Lado Esquerdo) */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-64 z-0 bg-gradient-to-r from-sky-500/10 to-transparent"
        ></div>
      </div>


      {/* --- CONTEÚDO (Fica na frente, z-10) --- */}
      <div className="flex items-center gap-4 relative z-10">
        {/* Lado esquerdo vazio (pode colocar breadcrumbs aqui depois) */}
      </div>

      <div className="relative z-10">
          <UserNav />
      </div>
    </header>
  );
}