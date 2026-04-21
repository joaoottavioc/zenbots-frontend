"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBotUsage, type UsageSummary } from "@/lib/billing";

export const BILLING_USAGE_QUERY_KEY = "billing-usage";

export function useBillingUsage(botId: number | string | null | undefined) {
  return useQuery<UsageSummary>({
    queryKey: [BILLING_USAGE_QUERY_KEY, botId],
    queryFn: () => fetchBotUsage(botId as number | string),
    enabled: botId !== null && botId !== undefined && botId !== "",
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 1;
    },
  });
}
