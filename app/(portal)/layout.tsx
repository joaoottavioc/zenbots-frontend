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
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  useSessionGuard();

  // Check auth on mount only (client-side) to avoid hydration mismatch
  useEffect(() => {
    const authed = isAuthenticated();
    setIsAuthed(authed); // eslint-disable-line react-hooks/set-state-in-effect -- auth guard must set state on mount
    if (!authed) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [router]);

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

  // Render nothing until auth check completes (same on server and client = no mismatch)
  if (isAuthed === null || !isAuthed) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-slate-900 focus:underline"
      >
        Ir para o conteúdo principal
      </a>

      {/* 1. TOP HEADER — full width, sticky */}
      <div className="sticky top-0 z-50 w-full">
        <TopHeader />
      </div>

      {/* 2. SIDEBAR + CONTENT below the header */}
      <div className="flex flex-1 min-w-0">

        {/* Sidebar — sticks below header */}
        <div className="sticky top-16 h-[calc(100vh-4rem)] hidden md:block z-40 shrink-0">
          <Sidebar />
        </div>

        {/* Conteúdo Principal */}
        <main id="main-content" className="flex-1 p-6 md:p-8 min-w-0">
          {children}
        </main>

      </div>
    </div>
  );
}
