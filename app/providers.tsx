"use client";

import { useState, useSyncExternalStore } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { initErrorReporting } from "@/lib/error-reporting";
import { cleanupLegacyAuth } from "@/lib/auth";

initErrorReporting();
cleanupLegacyAuth();

const emptySubscribe = () => () => {};

export default function Providers({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const status = (error as { response?: { status?: number } })?.response?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {mounted && <Toaster />}
    </QueryClientProvider>
  );
}