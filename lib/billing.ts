import { api } from "@/lib/api";

export type PlanTier = "free" | "pro" | "founder";
export type PlanKey = "free" | "pro_monthly" | "pro_annual" | "founder";

export interface UsagePlan {
  key: PlanKey;
  tier: PlanTier;
  title: string;
  monthly_order_cap: number | null;
  overage_per_order_brl: number;
  price: number;
}

export interface CurrentPeriod {
  year_month: string;
  completed_orders: number;
  cap: number | null;
  // Grace window upper bound — orders between `cap` and `overage_starts_at`
  // count but don't incur charges. Above this, each billable order costs
  // `plan.overage_per_order_brl`. null = no grace window.
  overage_starts_at: number | null;
  orders_remaining: number | null;
  pct_used: number;
  overage_orders: number;
  overage_amount_brl: number;
  projected_month_end_orders: number | null;
  projected_overage_brl: number | null;
}

export interface UpgradePlanOption {
  key: PlanKey;
  price: number;
  price_per_month?: number;
  label: string;
  slots_remaining?: number | null;
}

export interface UpgradeOffer {
  available_plans: UpgradePlanOption[];
}

export interface UsageSummary {
  bot_id: number;
  plan: UsagePlan;
  current_period: CurrentPeriod;
  upgrade_offer: UpgradeOffer;
}

export async function fetchBotUsage(botId: number | string): Promise<UsageSummary> {
  const res = await api.get<UsageSummary>(`/billing/usage`, {
    params: { bot_id: botId },
  });
  return res.data;
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export type UsageStage = "safe" | "warn" | "cap" | "overage";

export function classifyUsage(period: CurrentPeriod): UsageStage {
  if (period.overage_orders > 0) return "overage";
  if (period.cap !== null && period.completed_orders >= period.cap) return "cap";
  if (period.pct_used >= 0.8) return "warn";
  return "safe";
}

export function isFreeTier(plan: UsagePlan): boolean {
  return plan.tier === "free";
}
