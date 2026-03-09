import { AlertCircle, CheckCircle2, CreditCard, Banknote } from "lucide-react";

interface PaymentStatusBadgeProps {
  method?: string | null;
  status: string;
}

export function PaymentStatusBadge({ method, status }: PaymentStatusBadgeProps) {
  const methodClean = (method || "").toLowerCase();
  const isPix = methodClean.includes("pix");

  // 1. Lógica PIX
  if (isPix) {
    if (status === "PENDING") {
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 shadow-sm animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
            Aguardando Pix
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
          Pix Pago
        </span>
      </div>
    );
  }

  // 2. Cartão
  if (["card", "cartao", "cartão", "credito", "debito"].some(k => methodClean.includes(k))) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 shadow-sm">
        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
          Cartão
        </span>
      </div>
    );
  }

  // 3. Dinheiro
  if (["money", "dinheiro", "troco", "nota"].some(k => methodClean.includes(k))) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 shadow-sm">
        <Banknote className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          Dinheiro
        </span>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-400">
      <span className="text-[10px] font-bold uppercase">? Verificar</span>
    </div>
  );
}
