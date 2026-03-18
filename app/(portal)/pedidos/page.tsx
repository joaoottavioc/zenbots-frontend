"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import {
  Volume2,
  VolumeX,
  ChefHat,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import type { Order, OrderStatus } from "./types";
import { calculateTimeElapsed } from "./utils";
import { OrderColumn } from "./order-column";
import { TicketImpressao } from "./ticket-impressao";

function getApiBase() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  return url;
}

export default function PedidosPage() {
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  // --- Estados do Alerta Sonoro ---
  const [soundEnabled, setSoundEnabled] = useState(false);
  const previousPendingCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);

  // 1. BUSCA PEDIDOS
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ['orders', selectedBotId],
    queryFn: async () => {
      const res = await api.get(`/bots/${selectedBotId}/orders`);
      return res.data.map((order: { status: string; created_at: string; customer_name?: string; customer_phone: string; customer_address?: string | null } & Record<string, unknown>) => ({
        ...order,
        status: order.status.toUpperCase(),
        timeElapsed: calculateTimeElapsed(order.created_at),
        customerName: order.customer_name || order.customer_phone,
        fullAddress: order.customer_address,
        type: order.customer_address ? "DELIVERY" : "PICKUP"
      }));
    },
    enabled: !!selectedBotId,
    refetchInterval: isConnected ? false : 5_000,
  });

  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // 2. SSE (TEMPO REAL) — Autenticado via httpOnly cookie (EventSource)
  useEffect(() => {
    if (!isAuthenticated()) {
      setIsConnected(false);
      return;
    }

    const es = new EventSource(`${getApiBase()}/stream`, {
      withCredentials: true,
    });

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping') return;

        if (data.type === 'new_order' || data.type === 'payment_confirmed') {
          queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });

          if (data.type === 'new_order') {
            toast({
              title: "Novo Pedido na Cozinha!",
              description: `Cliente: ${data.payload.customer_name}`,
              className: "bg-slate-900 text-white border-slate-800"
            });
          } else if (data.type === 'payment_confirmed') {
            toast({
              title: "Pagamento Recebido!",
              description: `O Pedido #${data.payload.id || '?'} foi pago.`,
              className: "bg-emerald-600 text-white border-emerald-500"
            });
          }
        }
      } catch {
        // ignore malformed SSE data
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
    };
  }, [selectedBotId, queryClient, toast]);

  // 3. MUTAÇÕES
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number, newStatus: string }) => {
      return api.patch(`/bots/${selectedBotId}/orders/${orderId}`, {
        status: newStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" })
  });

  const takeoverMutation = useMutation({
    mutationFn: async ({ phone, active }: { phone: string, active: boolean }) => {
      const action = active ? "activate" : "deactivate";
      return api.post(`/takeover/${selectedBotId}/${phone}/${action}`);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
      const msg = variables.active ? "Atendimento Manual Ativado" : "Bot Reativado";
      toast({ title: msg, className: "bg-slate-800 text-white" });
    },
    onError: () => {
      toast({ title: "Erro no Takeover", variant: "destructive" });
    }
  });

  // 4. ÁUDIO
  useEffect(() => {
    audioRef.current = new Audio("/sounds/bell.mp3");
  }, []);

  useEffect(() => {
    if (!orders) return;
    const pendingOrders = orders.filter(o => ["PENDING", "PAID"].includes(o.status));
    const currentCount = pendingOrders.length;
    if (currentCount > previousPendingCount.current && soundEnabled) {
      audioRef.current?.play().catch(() => { });
    }
    previousPendingCount.current = currentCount;
  }, [orders, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      if (!prev) audioRef.current?.play().catch(() => { });
      return !prev;
    });
    toast({ title: !soundEnabled ? "Som Ativado 🔊" : "Som Mudo 🔇" });
  }, [toast, soundEnabled]);

  const handlePrint = useCallback((order: Order) => {
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 100);
  }, []);

  const handleCancel = useCallback((order: Order) => {
    setOrderToCancel(order);
  }, []);

  const handleTakeover = useCallback((phone: string, active: boolean) => {
    takeoverMutation.mutate({ phone, active });
  }, [takeoverMutation]);

  const getOrdersByStatus = useCallback((statusList: OrderStatus[]) => {
    return orders?.filter((order) => statusList.includes(order.status)).sort((a, b) => a.id - b.id) || [];
  }, [orders]);

  return (
    <PageContainer fullHeight>

      {/* --- CABEÇALHO PADRONIZADO (KDS) --- */}
      <PageHeader
        title="Gestão de Pedidos"
        titleSuffix={
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${isConnected
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-red-50 text-red-700 border-red-100"
            }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
            {isConnected ? "Online" : "Offline"}
          </div>
        }
        description="Acompanhe os pedidos da cozinha em tempo real."
        selectedBotId={selectedBotId}
        onBotChange={setSelectedBotId}
      >
        <button
          onClick={toggleSound}
          aria-label={soundEnabled ? "Silenciar" : "Ativar som"}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all border ${soundEnabled
            ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            : "bg-white border-dashed border-slate-300 text-slate-400 hover:bg-slate-50"
            }`}
          title={soundEnabled ? "Silenciar" : "Ativar Som"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
          <span className="hidden sm:inline">{soundEnabled ? "Som Ativo" : "Mudo"}</span>
        </button>
      </PageHeader>

      {/* --- BOARD KANBAN --- */}
      {!selectedBotId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
          <ChefHat className="h-16 w-16 opacity-20" />
          <p>Selecione um restaurante acima para visualizar os pedidos.</p>
        </div>
      ) : isLoadingOrders ? (
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[500px] w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-slate-100/50">
          <div className="h-full p-4 grid grid-cols-1 md:grid-cols-3 gap-4 md:min-w-[1000px]">

            <OrderColumn
              title="A Fazer"
              subtitle="Entrada de pedidos"
              orders={getOrdersByStatus(["PENDING", "PAID"])}
              topLineColor="bg-blue-500"
              statusBadgeColor="bg-blue-100 text-blue-700"
              onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "preparing" })}
              onTakeover={handleTakeover}
              actionLabel="Iniciar Preparo"
              actionVariant="primary"
              loading={updateStatusMutation.isPending}
              onPrint={handlePrint}
              onCancel={handleCancel}
            />

            <OrderColumn
              title="Em Preparo"
              subtitle="Cozinha ativa"
              orders={getOrdersByStatus(["PREPARING"])}
              topLineColor="bg-amber-500"
              statusBadgeColor="bg-amber-100 text-amber-700"
              onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "ready" })}
              onBack={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "paid" })}
              onTakeover={handleTakeover}
              actionLabel="Marcar Pronto"
              actionVariant="warning"
              loading={updateStatusMutation.isPending}
              onPrint={handlePrint}
              onCancel={handleCancel}
            />

            <OrderColumn
              title="Pronto / Expedição"
              subtitle="Aguardando entrega"
              orders={getOrdersByStatus(["READY"])}
              topLineColor="bg-emerald-500"
              statusBadgeColor="bg-emerald-100 text-emerald-700"
              onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "completed" })}
              onBack={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "preparing" })}
              onTakeover={handleTakeover}
              actionLabel="Finalizar"
              actionVariant="success"
              loading={updateStatusMutation.isPending}
              onPrint={handlePrint}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      <TicketImpressao order={orderToPrint} />

      {/* --- MODAL DE CANCELAMENTO --- */}
      <AlertDialog
        open={!!orderToCancel}
        onOpenChange={(open) => !open && setOrderToCancel(null)}
      >
        <AlertDialogContent className="max-w-[400px] border-slate-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-slate-900">
                Cancelar Pedido?
              </AlertDialogTitle>
            </div>

            <AlertDialogDescription asChild>
              <div className="text-slate-600 space-y-4">
                <p>
                  Você está prestes a cancelar o <strong>Pedido #{orderToCancel?.id}</strong>.
                  Esta ação é irreversível.
                </p>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total $</p>
                    <p className="text-sm font-bold text-rose-600">
                      {orderToCancel?.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Forma Pagamento</p>
                    <p className="text-sm font-bold text-slate-700 uppercase truncate">
                      {orderToCancel?.payment_method || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-left">
                  <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-1">
                    <p className="font-bold text-slate-500 uppercase">Itens do Pedido</p>
                    <span className="text-[10px] bg-slate-200 px-1 rounded">{orderToCancel?.type}</span>
                  </div>
                  {orderToCancel?.display_items.map((item, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-200 last:border-0">
                      <span className="font-medium text-slate-700">{item.quantity}x {item.product_name}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-amber-600 font-medium leading-tight">
                  ⚠️ Se o cliente pagou via Pix, lembre-se de realizar o estorno manualmente no seu gateway de pagamentos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8 flex flex-row items-center justify-end gap-3">
            <AlertDialogCancel asChild>
              <button className="px-6 py-2.5 rounded-lg bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-colors border-none outline-none focus:ring-0">
                Manter Pedido
              </button>
            </AlertDialogCancel>

            <AlertDialogAction asChild>
              <button
                onClick={() => {
                  if (orderToCancel) {
                    updateStatusMutation.mutate({ orderId: orderToCancel.id, newStatus: "canceled" });
                    setOrderToCancel(null);
                  }
                }}
                className="px-6 py-2.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-md shadow-rose-200 transition-all active:scale-95"
              >
                Sim, Cancelar
              </button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
