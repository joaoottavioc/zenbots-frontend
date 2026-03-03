"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { Sidebar } from "@/components/ui/sidebar";
import { TopHeader } from "@/components/layout/top-header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  useSessionGuard();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    } else {
      setIsAuthed(true);
    }
  }, [router]);

  // Cross-tab auth sync: redirect if another tab removes the token
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'zenbots_token' && !event.newValue) {
        router.replace('/login');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
