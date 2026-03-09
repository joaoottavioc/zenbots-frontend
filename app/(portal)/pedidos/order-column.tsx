import React from "react";
import { LayoutList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Order } from "./types";
import { OrderCard } from "./order-card";

interface OrderColumnProps {
  title: string;
  subtitle: string;
  orders: Order[];
  topLineColor: string;
  statusBadgeColor: string;
  onAction: (id: number) => void;
  onBack?: (id: number) => void;
  onCancel: (order: Order) => void;
  onTakeover: (phone: string, active: boolean) => void;
  onPrint: (order: Order) => void;
  actionLabel: string;
  actionVariant: "primary" | "warning" | "success";
  loading: boolean;
}

export const OrderColumn = React.memo(function OrderColumn({ title, subtitle, orders, topLineColor, statusBadgeColor, onAction, onBack, onCancel, onTakeover, onPrint, actionLabel, actionVariant, loading }: OrderColumnProps) {
  return (
    <div className="flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">

      <div className={`h-1.5 w-full ${topLineColor}`} />

      <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
        </div>
        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
          {orders.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-300">
        {orders.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <LayoutList className="h-10 w-10 mb-2" />
            <span className="text-sm">Vazio</span>
          </div>
        )}
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onAction={() => onAction(order.id)}
            onBack={onBack ? () => onBack(order.id) : undefined}
            onCancel={() => onCancel(order)}
            onTakeover={onTakeover}
            onPrint={() => onPrint(order)}
            actionLabel={actionLabel}
            actionVariant={actionVariant}
            disabled={loading}
            badgeColor={statusBadgeColor}
          />
        ))}
      </div>
    </div>
  );
});
