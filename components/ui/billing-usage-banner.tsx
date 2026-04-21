"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, ArrowRight, X, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBillingUsage } from "@/hooks/use-billing-usage";
import { classifyUsage, isFreeTier, formatBRL } from "@/lib/billing";

interface BannerBot {
  id: number;
  restaurant_name: string;
}

const WARN_DISMISS_KEY = "billing-warn-dismissed-until";
const OVERAGE_MODAL_KEY = "billing-overage-modal-shown";

function todayBRT(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function BillingUsageBanner() {
  const { data: bots } = useQuery<BannerBot[]>({
    queryKey: ["myBots"],
    queryFn: async () => (await api.get("/bots")).data,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const firstBotId = bots && bots.length > 0 ? bots[0].id : null;
  const { data: usage } = useBillingUsage(firstBotId);

  const [warnDismissed, setWarnDismissed] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(WARN_DISMISS_KEY);
    const until = raw ? Number(raw) : 0;
    setWarnDismissed(until > Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- read localStorage once on mount
  }, []);

  useEffect(() => {
    if (!usage) return;
    const stage = classifyUsage(usage.current_period);
    if (stage !== "overage") return;
    const today = todayBRT();
    const shownKey = `${OVERAGE_MODAL_KEY}-${today}`;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(shownKey)) return;
    setModalOpen(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-shot modal trigger once usage data arrives
    localStorage.setItem(shownKey, "1");
  }, [usage]);

  if (!usage || !isFreeTier(usage.plan)) return null;

  const period = usage.current_period;
  const stage = classifyUsage(period);

  if (stage === "safe" || (stage === "warn" && warnDismissed)) return null;

  const handleDismiss = () => {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(WARN_DISMISS_KEY, String(until));
    setWarnDismissed(true);
  };

  return (
    <>
      {stage === "warn" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              Faltam {period.orders_remaining} pedidos para o limite do plano Grátis ({period.completed_orders}/{period.cap}).
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Atualize por R$ 89/mês (anual) ou R$ 129,90 (mensal) e nunca mais se preocupe com limites.
            </p>
          </div>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-8">
            <Link href="/billing">
              Ver planos
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <button
            onClick={handleDismiss}
            aria-label="Dispensar por 24h"
            className="text-amber-600 hover:text-amber-800 p-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {stage === "cap" && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-900">
              Limite atingido · {period.completed_orders}/{period.cap} pedidos este mês.
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              Próximos pedidos: R$ {usage.plan.overage_per_order_brl.toFixed(2).replace(".", ",")} cada. Economize com o Pro.
            </p>
          </div>
          <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700 text-white h-8">
            <Link href="/billing">
              Atualizar agora
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {stage === "overage" && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-900">
              Você já tem {formatBRL(period.overage_amount_brl)} em pedidos extras este mês.
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              O Pro custa menos e tira todos os limites. Troque de plano em segundos.
            </p>
          </div>
          <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white h-8">
            <Link href="/billing">
              Atualizar agora
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <AlertCircle className="h-6 w-6 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Você está pagando por excesso
            </DialogTitle>
            <DialogDescription className="text-center">
              Este mês você já acumulou <strong className="text-rose-700">{formatBRL(period.overage_amount_brl)}</strong> em pedidos além do limite do plano Grátis.
              No ritmo atual, pode chegar a{" "}
              <strong className="text-rose-700">
                {period.projected_overage_brl !== null ? formatBRL(period.projected_overage_brl) : "muito mais"}
              </strong>
              {" "}no fim do mês.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-cyan-900">
              <Zap className="h-4 w-4 text-cyan-600" />
              Plano Pro Anual
            </div>
            <p className="mt-1 text-cyan-800">
              <span className="text-lg font-bold text-cyan-900">R$ 89</span>
              <span className="text-xs">/mês (anual — 31% off)</span>
            </p>
            <p className="mt-2 text-xs text-cyan-700">
              Pedidos ilimitados, suporte prioritário, e você economiza agora mesmo.
            </p>
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Agora não
            </Button>
            <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
              <Link href="/billing">Ver planos</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
