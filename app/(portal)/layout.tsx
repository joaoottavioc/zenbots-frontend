// app/(portal)/layout.tsx
"use client"; // Precisa ser client component se a Sidebar for

import { Sidebar } from "@/components/ui/sidebar"; // Importa o menu lateral

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* 1. O Menu Lateral (Sidebar) */}
      <Sidebar />
      
      {/* 2. A Área de Conteúdo Principal (onde suas páginas irão) */}
      <main className="flex-1 p-8 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}