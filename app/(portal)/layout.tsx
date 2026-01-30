"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { TopHeader } from "@/components/layout/top-header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Flex container principal
    <div className="flex min-h-screen bg-slate-50">
      
      {/* 1. SIDEBAR FIXO (STICKY) */}
      {/* sticky top-0 h-screen: Faz o menu grudar no topo e ter SEMPRE a altura da janela.
          z-50: Garante que fique acima de outros elementos se houver sobreposição.
      */}
      <div className="sticky top-0 h-screen hidden md:block z-50 shrink-0">
        <Sidebar />
      </div>
      
      {/* 2. ÁREA DE CONTEÚDO (COLUNA DA DIREITA) */}
      {/* flex-1: Ocupa o resto da largura */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header também pode ser sticky se você quiser que ele acompanhe */}
        <div className="sticky top-0 z-40 w-full">
           <TopHeader />
        </div>
        
        {/* Conteúdo Principal */}
        <main className="p-6 md:p-8 w-full max-w-[100vw]">
          {children}
        </main>
        
      </div>
    </div>
  );
}