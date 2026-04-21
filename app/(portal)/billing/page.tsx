"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";
import { useToast } from "@/hooks/use-toast";
import { useBillingUsage } from "@/hooks/use-billing-usage";
import { classifyUsage, formatBRL, isFreeTier, type UpgradePlanOption } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Crown, Sparkles, TrendingUp, Zap } from "lucide-react";

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
          <div className="flex items-baseline justify-between mb-2">
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
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex items-center gap-2 text-xs text-slate-700">
            <TrendingUp className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              Projeção: <strong className="tabular-nums">{period.projected_month_end_orders}</strong> pedidos até o fim do mês
              {period.projected_overage_brl !== null && period.projected_overage_brl > 0 && (
                <>
                  {" · "}potencial excesso de{" "}
                  <strong className="text-rose-700 tabular-nums">
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

interface UpgradeCardProps {
  planKey: string;
  title: string;
  priceLabel: string;
  sublabel?: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  accent: "cyan" | "amber";
  onSelect: () => void;
  scarcity?: string;
}

function UpgradeCard({
  title,
  priceLabel,
  sublabel,
  features,
  highlight,
  badge,
  accent,
  onSelect,
  scarcity,
}: UpgradeCardProps) {
  const accentCls = accent === "amber" ? "border-amber-300 ring-amber-200" : "border-cyan-300 ring-cyan-200";
  const iconCls = accent === "amber" ? "bg-amber-100 text-amber-700" : "bg-cyan-100 text-cyan-700";
  const Icon = accent === "amber" ? Crown : Zap;

  return (
    <Card
      className={cn(
        "relative transition-shadow",
        highlight && "ring-2 shadow-md",
        highlight && accentCls,
      )}
    >
      {badge && (
        <div
          className={cn(
            "absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase text-white",
            accent === "amber" ? "bg-amber-500" : "bg-cyan-500",
          )}
        >
          {badge}
        </div>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconCls)}>
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <div className="pt-2">
          <span className="text-2xl font-bold text-slate-900">{priceLabel}</span>
          {sublabel && <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {scarcity && (
          <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            {scarcity}
          </div>
        )}

        <Button
          onClick={onSelect}
          className={cn(
            "w-full",
            accent === "amber"
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-cyan-600 hover:bg-cyan-700",
          )}
        >
          Escolher {title}
        </Button>
      </CardContent>
    </Card>
  );
}

function UpgradeOptions({ botId }: { botId: string }) {
  const { data: usage, isLoading } = useBillingUsage(botId);
  const { toast } = useToast();

  if (isLoading || !usage) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-1">Escolha seu plano</h2>
      <p className="text-sm text-slate-500 mb-4">
        Atualize para liberar pedidos ilimitados e deixar o limite pra trás.
      </p>

      <div className={cn("grid grid-cols-1 gap-4", founderAvailable ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {monthly && (
          <UpgradeCard
            planKey={monthly.key}
            title="Pro Mensal"
            priceLabel={formatBRL(monthly.price)}
            sublabel="por mês · cancele quando quiser"
            features={PRO_FEATURES}
            accent="cyan"
            onSelect={() => handleSelect(monthly)}
          />
        )}

        {annual && (
          <UpgradeCard
            planKey={annual.key}
            title="Pro Anual"
            priceLabel={`${formatBRL(annual.price_per_month ?? annual.price / 12)}/mês`}
            sublabel={`${formatBRL(annual.price)} cobrados anualmente · 31% off`}
            features={PRO_FEATURES}
            highlight
            badge="Melhor valor"
            accent="cyan"
            onSelect={() => handleSelect(annual)}
          />
        )}

        {founderAvailable && founder && (
          <UpgradeCard
            planKey={founder.key}
            title="Fundador"
            priceLabel={`${formatBRL(founder.price)}/mês`}
            sublabel="preço travado pra sempre"
            features={FOUNDER_FEATURES}
            badge="Edição limitada"
            accent="amber"
            scarcity={`Restam ${founder.slots_remaining} de 30 vagas`}
            onSelect={() => handleSelect(founder)}
          />
        )}
      </div>
    </div>
  );
}

function BillingFAQ() {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-2">Perguntas frequentes</h2>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="limit">
          <AccordionTrigger>Como funciona o limite do plano Grátis?</AccordionTrigger>
          <AccordionContent>
            <p className="text-slate-600">
              Você pode processar até 15 pedidos concluídos por mês sem custo. A partir do 16º pedido,
              cobramos R$ 1,39 por pedido adicional. O contador zera todo dia 1º e o histórico continua
              visível no painel de pedidos normalmente.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cancel">
          <AccordionTrigger>Posso cancelar quando quiser?</AccordionTrigger>
          <AccordionContent>
            <p className="text-slate-600">
              Sim. O plano Pro mensal pode ser cancelado a qualquer momento — você continua no Pro até o
              fim do ciclo já pago, e depois volta automaticamente para o Grátis. O plano anual é não
              reembolsável, mas também não renova se você cancelar antes.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="no-upgrade">
          <AccordionTrigger>O que acontece com meus pedidos se eu não atualizar?</AccordionTrigger>
          <AccordionContent>
            <p className="text-slate-600">
              Nada é bloqueado: seu bot continua atendendo normalmente. Os pedidos acima do limite
              entram como excedentes a R$ 1,39 cada, somados no fim do mês. O painel mostra em tempo real
              quanto você já acumulou e quanto pode chegar se continuar nesse ritmo.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fair-use">
          <AccordionTrigger>O que é o fair-use de 5.000 pedidos do Pro?</AccordionTrigger>
          <AccordionContent>
            <p className="text-slate-600">
              O Pro é ilimitado para a enorme maioria dos restaurantes. Acima de 5.000 pedidos no mês,
              entramos em contato para desenhar um plano sob medida — sem surpresa na fatura.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
          <BillingFAQ />
        </div>
      )}
    </PageContainer>
  );
}
