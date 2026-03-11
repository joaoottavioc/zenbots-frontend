"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, AUTH_CHANNEL_NAME } from "@/lib/auth";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { Sidebar } from "@/components/ui/sidebar";
import { TopHeader } from "@/components/layout/top-header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthed] = useState(() => isAuthenticated());
  useSessionGuard();

  useEffect(() => {
    if (!isAuthed) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isAuthed, router]);

  // Cross-tab auth sync: redirect if another tab broadcasts logout
  useEffect(() => {
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'logout') {
          router.replace('/login');
        }
      };
    } catch {
      // BroadcastChannel not supported
      return;
    }
    return () => channel.close();
  }, [router]);

  if (!isAuthed) {
    return null;
  }

  return (
    // Flex container principal
    <div className="flex min-h-screen bg-background">

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-slate-900 focus:underline"
      >
        Ir para o conteúdo principal
      </a>

      {/* 1. SIDEBAR FIXO (STICKY) */}
      <div className="sticky top-0 h-screen hidden md:block z-50 shrink-0">
        <Sidebar />
      </div>

      {/* 2. ÁREA DE CONTEÚDO (COLUNA DA DIREITA) */}
      <div className="flex-1 flex flex-col min-w-0">

        <div className="sticky top-0 z-40 w-full">
           <TopHeader />
        </div>

        {/* Conteúdo Principal */}
        <main id="main-content" className="p-6 md:p-8 w-full max-w-[100vw]">
          {children}
        </main>

      </div>
    </div>
  );
}
