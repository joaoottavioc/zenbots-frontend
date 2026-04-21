"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Crown, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useBillingUsage } from "@/hooks/use-billing-usage";
import { classifyUsage, isFreeTier, formatBRL, type UsageStage } from "@/lib/billing";

interface SidebarBot {
  id: number;
  restaurant_name: string;
}

const STAGE_BAR: Record<UsageStage, string> = {
  safe: "bg-emerald-400",
  warn: "bg-amber-400",
  cap: "bg-orange-400",
  overage: "bg-rose-500",
};

const STAGE_TEXT: Record<UsageStage, string> = {
  safe: "text-zinc-400",
  warn: "text-amber-300",
  cap: "text-orange-300",
  overage: "text-rose-300",
};

export function BillingUsageWidget() {
  const { data: bots } = useQuery<SidebarBot[]>({
    queryKey: ["myBots"],
    queryFn: async () => (await api.get("/bots")).data,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const firstBotId = bots && bots.length > 0 ? bots[0].id : null;
  const { data: usage, isLoading } = useBillingUsage(firstBotId);

  if (!bots || bots.length === 0) return null;

  if (isLoading || !usage) {
    return (
      <div className="mx-3 mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="h-2.5 w-20 rounded bg-white/10" />
        <div className="mt-2.5 h-4 w-24 rounded bg-white/10" />
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/10" />
      </div>
    );
  }

  const { plan, current_period: period } = usage;
  const free = isFreeTier(plan);
  const stage = classifyUsage(period);

  const pct = Math.min(100, Math.max(0, Math.round(period.pct_used * 100)));
  const barStage: UsageStage = stage === "safe" && pct === 0 ? "safe" : stage;

  const Icon = plan.tier === "founder" ? Crown : plan.tier === "pro" ? Zap : Sparkles;

  return (
    <Link
      href="/billing"
      className="mx-3 mb-3 block rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-3 group"
      aria-label={`Plano ${plan.title} — abrir faturamento`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium">
          Plano {plan.title}
        </span>
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            plan.tier === "founder"
              ? "text-amber-300"
              : plan.tier === "pro"
                ? "text-cyan-300"
                : "text-zinc-500 group-hover:text-zinc-300 transition-colors",
          )}
        />
      </div>

      {free && period.cap !== null ? (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-white tabular-nums">
              {period.completed_orders}
              <span className="text-zinc-500"> / {period.cap}</span>
            </span>
            <span className="text-[10px] text-zinc-500">pedidos</span>
          </div>

          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn("h-full transition-all rounded-full", STAGE_BAR[barStage])}
              style={{ width: `${pct}%` }}
            />
          </div>

          {stage === "warn" && period.orders_remaining !== null && (
            <div className={cn("mt-2 text-[10px] font-medium leading-tight", STAGE_TEXT.warn)}>
              Faltam {period.orders_remaining} — atualize para o Pro
            </div>
          )}

          {stage === "cap" && (
            <div className={cn("mt-2 text-[10px] font-medium leading-tight", STAGE_TEXT.cap)}>
              Limite atingido · extras R$ {plan.overage_per_order_brl.toFixed(2).replace(".", ",")}
            </div>
          )}

          {stage === "overage" && (
            <div className={cn("mt-2 text-[10px] font-medium leading-tight", STAGE_TEXT.overage)}>
              Excesso: {formatBRL(period.overage_amount_brl)} este mês
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 space-y-0.5">
          <div className="text-sm font-semibold text-white tabular-nums">
            {period.completed_orders} pedidos
          </div>
          <div className="text-[10px] text-zinc-500">ilimitado este mês</div>
        </div>
      )}
    </Link>
  );
}
