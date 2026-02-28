import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onSessionExpired } from "@/lib/auth-events";

/**
 * Clears the React Query cache when the session expires (401).
 * Mount once in the portal layout.
 */
export function useSessionGuard(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onSessionExpired(() => {
      queryClient.clear();
    });
  }, [queryClient]);
}
