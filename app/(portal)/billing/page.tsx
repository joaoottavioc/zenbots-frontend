"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Crown, Sparkles, TrendingUp, Zap } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BillingFAQ, USAGE_PAGE_FAQ_ITEMS } from "@/components/ui/billing-faq";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanCard } from "@/components/ui/plan-card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/hooks/use-toast";
import { useBillingUsage } from "@/hooks/use-billing-usage";
import { classifyUsage, formatBRL, isFreeTier, type UpgradePlanOption } from "@/lib/billing";
import { cn } from "@/lib/utils";

function UsageCurrentCard({ botId }: { botId: string }) {
  const { data: usage, isLoading } = useBillingUsage(botId);

  if (isLoading || !usage) {
    return <Skeleton className="h-48 w-full" />;
  }

  const { plan, current_period: period } = usage;
  const free = isFreeTier(plan);
  const stage = classifyUsage(period);
  const pct = Math.min(100, Math.round(period.pct_used * 100));

  const stageColor =
    stage === "overage"
      ? "text-rose-600"
      : stage === "cap"
        ? "text-orange-600"
        : stage === "warn"
          ? "text-amber-600"
          : "text-emerald-600";

  const barColor =
    stage === "overage"
      ? "[&>[data-slot=progress-indicator]]:bg-rose-500 [&>*]:bg-rose-500"
      : stage === "cap"
        ? "[&>*]:bg-orange-500"
        : stage === "warn"
          ? "[&>*]:bg-amber-500"
          : "[&>*]:bg-emerald-500";

  const Icon = plan.tier === "founder" ? Crown : plan.tier === "pro" ? Zap : Sparkles;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                plan.tier === "founder"
                  ? "bg-amber-100 text-amber-700"
                  : plan.tier === "pro"
                    ? "bg-cyan-100 text-cyan-700"
                    : "bg-slate-100 text-slate-600",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Plano {plan.title}</CardTitle>
              <CardDescription>
                {plan.price > 0 ? formatBRL(plan.price) : "Grátis"}
                {free && plan.monthly_order_cap !== null && ` · até ${plan.monthly_order_cap} pedidos/mês`}
                {!free && " · pedidos ilimitados"}
              </CardDescription>
            </div>
          </div>
          <Badge variant={free ? "secondary" : "default"}>
            {free ? "Atual" : plan.tier === "founder" ? "Fundador" : "Ativo"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <div>
              <span className={cn("text-3xl font-bold tabular-nums", stageColor)}>
                {period.completed_orders}
              </span>
              {period.cap !== null && (
                <span className="text-xl font-medium text-slate-400 tabular-nums">
                  {" "}/ {period.cap}
                </span>
              )}
              <span className="ml-2 text-sm text-slate-500">pedidos em {period.year_month}</span>
            </div>
            {period.cap !== null && (
              <span className={cn("text-sm font-medium tabular-nums", stageColor)}>{pct}%</span>
            )}
          </div>

          {period.cap !== null ? (
            <Progress value={pct} className={cn("h-2", barColor)} />
          ) : (
            <div className="text-xs text-slate-500">Sem limite mensal neste plano.</div>
          )}
        </div>

        {free && period.projected_month_end_orders !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <TrendingUp className="h-4 w-4 shrink-0 text-slate-500" />
            <span>
              Projeção: <strong className="tabular-nums">{period.projected_month_end_orders}</strong> pedidos até o fim do mês
              {period.projected_overage_brl !== null && period.projected_overage_brl > 0 && (
                <>
                  {" · "}potencial excesso de{" "}
                  <strong className="tabular-nums text-rose-700">
                    {formatBRL(period.projected_overage_brl)}
                  </strong>
                </>
              )}
              .
            </span>
          </div>
        )}

        {period.overage_orders > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pedidos além do limite</AlertTitle>
            <AlertDescription>
              {period.overage_orders} pedidos cobrados como excesso = {formatBRL(period.overage_amount_brl)} este mês.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

const PRO_FEATURES = [
  "Pedidos ilimitados (fair-use 5.000/mês)",
  "Suporte prioritário por WhatsApp",
  "Sem interrupção por limite",
  "Todos os recursos do Grátis",
];

const FOUNDER_FEATURES = [
  "Tudo do Plano Pro",
  "Preço travado para sempre",
  "Acesso antecipado a novos recursos",
  "Selo de Fundador no perfil",
];

function UpgradeOptions({ botId }: { botId: string }) {
  const { data: usage, isLoading } = useBillingUsage(botId);
  const { toast } = useToast();

  if (isLoading || !usage) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!isFreeTier(usage.plan)) return null;

  const plans = usage.upgrade_offer.available_plans;
  const monthly = plans.find((p) => p.key === "pro_monthly");
  const annual = plans.find((p) => p.key === "pro_annual");
  const founder = plans.find((p) => p.key === "founder");
  const founderAvailable = founder && founder.slots_remaining !== null && (founder.slots_remaining ?? 0) > 0;

  const handleSelect = (plan: UpgradePlanOption) => {
    toast({
      title: "Em breve",
      description: `O checkout para o plano ${plan.key.replace("_", " ")} estará disponível em instantes.`,
    });
  };

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-slate-900">Escolha seu plano</h2>
      <p className="mb-4 text-sm text-slate-500">
        Atualize para liberar pedidos ilimitados e deixar o limite pra trás.
      </p>

      <div className={cn("grid grid-cols-1 gap-4", founderAvailable ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {monthly && (
          <PlanCard
            title="Pro Mensal"
            priceLabel={formatBRL(monthly.price)}
            priceSublabel="por mês · cancele quando quiser"
            features={PRO_FEATURES}
            accent="cyan"
            ctaLabel="Escolher Pro Mensal"
            onSelect={() => handleSelect(monthly)}
          />
        )}

        {annual && (
          <PlanCard
            title="Pro Anual"
            priceLabel={`${formatBRL(annual.price_per_month ?? annual.price / 12)}/mês`}
            priceSublabel={`${formatBRL(annual.price)} cobrados anualmente · 31% off`}
            features={PRO_FEATURES}
            accent="cyan"
            badge="Melhor valor"
            highlight
            ctaLabel="Escolher Pro Anual"
            onSelect={() => handleSelect(annual)}
          />
        )}

        {founderAvailable && founder && (
          <PlanCard
            title="Fundador"
            priceLabel={`${formatBRL(founder.price)}/mês`}
            priceSublabel="preço travado pra sempre"
            features={FOUNDER_FEATURES}
            accent="amber"
            badge="Edição limitada"
            scarcity={`Restam ${founder.slots_remaining} de 30 vagas`}
            ctaLabel="Escolher Fundador"
            onSelect={() => handleSelect(founder)}
          />
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const initialBotId = searchParams.get("bot_id");
  const [selectedBotId, setSelectedBotId] = useState<string | null>(initialBotId);

  return (
    <PageContainer>
      <PageHeader
        title="Plano & uso"
        description="Acompanhe o consumo do mês e escolha o plano que cabe no seu ritmo."
        selectedBotId={selectedBotId}
        onBotChange={setSelectedBotId}
      />

      {!selectedBotId ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Selecione um restaurante acima para ver o consumo.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <UsageCurrentCard botId={selectedBotId} />
          <UpgradeOptions botId={selectedBotId} />
          <BillingFAQ items={USAGE_PAGE_FAQ_ITEMS} />
        </div>
      )}
    </PageContainer>
  );
}
