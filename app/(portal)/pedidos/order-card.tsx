import React from "react";
import {
  Clock,
  Bike,
  ShoppingBag,
  User,
  MapPin,
  Printer,
  Undo2,
  Ban,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Order } from "./types";
import { getMinutesFromDate } from "./utils";
import { PaymentStatusBadge } from "./payment-status-badge";
import { WhatsAppIcon } from "./whatsapp-icon";

interface OrderCardProps {
  order: Order;
  onAction: () => void;
  onBack?: () => void;
  onCancel: () => void;
  onTakeover: (phone: string, active: boolean) => void;
  onPrint: () => void;
  actionLabel: string;
  actionVariant: "primary" | "warning" | "success";
  disabled: boolean;
  badgeColor: string;
}

export const OrderCard = React.memo(function OrderCard({ order, onAction, onBack, onCancel, onTakeover, onPrint, actionLabel, actionVariant, disabled }: OrderCardProps) {
  const minutes = getMinutesFromDate(order.created_at);

  let timerStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  let timerIconColor = "text-emerald-600";

  if (minutes > 10 && minutes <= 20) {
    timerStyle = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
    timerIconColor = "text-amber-600";
  } else if (minutes > 20) {
    timerStyle = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold";
    timerIconColor = "text-rose-600";
  }

  const whatsappLink = order.customer_phone
    ? `https://wa.me/${order.customer_phone.replace(/\D/g, '')}`
    : null;

  const isPix = (order.payment_method || "").toLowerCase().includes("pix");
  const isPixPending = isPix && order.status === "PENDING";
  const isActionDisabled = disabled || isPixPending;

  let currentActionLabel = actionLabel;
  if (isPixPending) currentActionLabel = "Aguardando Pix";

  const btnVariants: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
  };

  return (
    <div className={`group bg-white rounded-xl border shadow-sm transition-all duration-200 flex flex-col ${isPixPending ? 'border-rose-100 bg-rose-50/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>

      {/* HEADER */}
      <div className="p-3 border-b border-slate-100/50 flex justify-between items-start">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-700">#{order.id}</span>
              <div className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 border ${timerStyle}`}>
                <Clock className={`w-3 h-3 ${timerIconColor}`} />
                {order.timeElapsed}
              </div>
            </div>
            <div title="Atendimento Humano" className="opacity-30 group-hover:opacity-100 transition-opacity">
              <Switch
                className="scale-75 data-[state=checked]:bg-blue-600"
                checked={order.human_takeover_active}
                onCheckedChange={(checked) => onTakeover(order.customer_phone, checked)}
                aria-label="Atendimento humano"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {order.type === "DELIVERY" ? (
              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 uppercase tracking-wide">
                <Bike className="w-3.5 h-3.5" /> Entrega
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 uppercase tracking-wide">
                <ShoppingBag className="w-3.5 h-3.5" /> Retirada
              </div>
            )}
            <PaymentStatusBadge method={order.payment_method} status={order.status} />
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <div className="p-3 flex-1 space-y-3">
        {order.display_items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 text-sm">
            <div className="font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 h-6 flex items-center justify-center min-w-[24px] text-xs">
              {item.quantity}x
            </div>
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-slate-800 leading-snug uppercase text-sm">
                  {item.product_name}
                </span>
                {item.price_at_time_of_order && (
                  <span className="text-xs font-medium text-slate-400 whitespace-nowrap ml-2">
                    {(item.price_at_time_of_order * item.quantity).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                )}
              </div>
              {item.notes && (
                <div className="mt-1 flex items-start gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 w-fit">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="uppercase">{item.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="bg-slate-50/50 p-3 border-t border-slate-100">
        <div className="flex flex-col gap-3 mb-3">
          {order.type === "DELIVERY" && (
            <div className="flex justify-between items-center px-2 py-1 bg-sky-50/50 rounded border border-sky-100/50 mb-2">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-tight">Taxa de Entrega</span>
              <span className="text-xs font-bold text-sky-700">
                {order.delivery_fee?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00"}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total do Pedido</span>
            <span className="text-sm font-black text-slate-900">
              {order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-slate-500" />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {order.customerName || "Cliente"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {whatsappLink && (
                <a
                  href={whatsappLink} target="_blank" rel="noreferrer"
                  className="p-1.5 hover:bg-green-100 text-slate-400 hover:text-green-600 rounded-md transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
              )}
              <button onClick={onPrint} aria-label="Imprimir pedido" className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {order.type === "DELIVERY" && order.fullAddress && (
            <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-tight line-clamp-2">{order.fullAddress}</span>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 h-9">
          {onBack && (
            <Button onClick={onBack} disabled={disabled} aria-label="Voltar status" variant="outline" size="icon" className="px-3 text-slate-400 hover:text-slate-700">
              <Undo2 className="w-4 h-4" />
            </Button>
          )}

          {onCancel && order.status !== "CANCELED" && order.status !== "COMPLETED" && (
            <Button
              onClick={onCancel}
              disabled={disabled}
              aria-label="Cancelar pedido"
              variant="outline"
              size="icon"
              className="px-3 border-rose-200 text-rose-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
              title="Cancelar Pedido"
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}

          <Button
            onClick={onAction}
            disabled={isActionDisabled}
            className={`flex-1 text-xs font-bold uppercase tracking-wider
                ${isActionDisabled
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : `${btnVariants[actionVariant]} active:scale-[0.98]`
              }`}
          >
            {isPixPending && <Clock className="w-3 h-3 animate-spin" />}
            {currentActionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
});
