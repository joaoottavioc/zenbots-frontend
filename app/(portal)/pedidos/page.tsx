"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
//import { BotSelector } from "@/components/ui/bot-selector";
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  Clock,
  Bike,
  ShoppingBag,
  MessageCircle,
  Bot,
  User,
  Undo2,
  LayoutList,
  MapPin,
  Printer,
  Volume2,
  VolumeX,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  Ban     // <--- NOVO (Botão Cancelar)

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

// --- Tipos ---
type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELED";

interface OrderItem {
  quantity: number;
  product_name: string;
  price_at_time_of_order?: number;
  notes?: string | null;
}

interface Order {
  id: number;
  total_amount: number;
  status: OrderStatus;
  payment_method?: string;
  customer_address: string | null;
  created_at: string;
  display_items: OrderItem[];
  customer_phone: string;
  human_takeover_active: boolean;
  timeElapsed?: string;
  customerName?: string;
  fullAddress?: string;
  type?: "DELIVERY" | "PICKUP";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
      const res = await api.get(`${API_BASE}/bots/${selectedBotId}/orders`);
      return res.data.map((order: any) => ({
        ...order,
        status: order.status.toUpperCase(),
        timeElapsed: calculateTimeElapsed(order.created_at),
        customerName: order.customer_name || order.customer_phone,
        fullAddress: order.customer_address,
        type: order.customer_address ? "DELIVERY" : "PICKUP"
      }));
    },
    enabled: !!selectedBotId,
  });

  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // 2. SSE (TEMPO REAL)
  useEffect(() => {
    const evtSource = new EventSource(`${API_BASE}/stream`);

    evtSource.onopen = () => {
      console.log("🟢 Conectado ao KDS Stream");
      setIsConnected(true);
    };

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping') return;

        if (data.type === 'new_order' || data.type === 'payment_confirmed') {
          console.log("🔔 Atualização recebida:", data.type, data.payload);

          // OBRIGATÓRIO: Isso força o React a baixar a lista atualizada (com o status PAID)
          queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });

          // Notificação específica para cada caso
          if (data.type === 'new_order') {
            toast({
              title: "Novo Pedido na Cozinha! 👨‍🍳",
              description: `Cliente: ${data.payload.customer_name}`,
              className: "bg-slate-900 text-white border-slate-800"
            });
          } else if (data.type === 'payment_confirmed') {
            toast({
              title: "Pagamento Recebido! 💰",
              description: `O Pedido #${data.payload.id || '?'} foi pago.`,
              className: "bg-emerald-600 text-white border-emerald-500"
            });
          }
        }
      } catch (err) {
        console.error("Erro SSE:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.error("🔴 Erro SSE", err);
      setIsConnected(false);
    };

    return () => {
      evtSource.close();
    };
  }, [selectedBotId, queryClient, toast]);

  // 3. MUTAÇÕES
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number, newStatus: string }) => {
      return api.patch(`${API_BASE}/bots/${selectedBotId}/orders/${orderId}`, {
        status: newStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
      // toast({ title: "Status atualizado" }); // Comentado para limpar visual
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" })
  });

  const takeoverMutation = useMutation({
    mutationFn: async ({ phone, active }: { phone: string, active: boolean }) => {
      const action = active ? "activate" : "deactivate";
      return api.post(`${API_BASE}/takeover/${selectedBotId}/${phone}/${action}`);
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

  const toggleSound = () => {
    if (!soundEnabled) audioRef.current?.play().catch(() => { });
    setSoundEnabled(!soundEnabled);
    toast({ title: !soundEnabled ? "Som Ativado 🔊" : "Som Mudo 🔇" });
  };

  const handlePrint = (order: Order) => {
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getOrdersByStatus = (statusList: OrderStatus[]) => {
    return orders?.filter((order) => statusList.includes(order.status)).sort((a, b) => a.id - b.id) || [];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] min-h-[650px] space-y-2">

      {/* --- HEADER --- */}
      {/* --- TOOLBAR DA COZINHA (Substitui o Header Antigo) --- */}
      {/* --- TOOLBAR DA COZINHA --- */}
      {/* --- CABEÇALHO PADRONIZADO (KDS) --- */}
      <DashboardHeader
        title={
          <span className="font-heading font-bold tracking-tight">
            Gestão de Pedidos
          </span>
        }
        // Passamos o Badge aqui para ficar colado no título
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
        {/* Apenas botões de ação ficam aqui na direita */}
        <button
          onClick={toggleSound}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all border ${soundEnabled
            ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            : "bg-white border-dashed border-slate-300 text-slate-400 hover:bg-slate-50"
            }`}
          title={soundEnabled ? "Silenciar" : "Ativar Som"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
          <span className="hidden sm:inline">{soundEnabled ? "Som Ativo" : "Mudo"}</span>
        </button>
      </DashboardHeader>

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
          <div className="h-full p-4 grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[1000px]">

            {/* COLUNA 1: A FAZER */}
            <OrderColumn
              title="A Fazer"
              subtitle="Entrada de pedidos"
              orders={getOrdersByStatus(["PENDING", "PAID"])}
              topLineColor="bg-blue-500"
              statusBadgeColor="bg-blue-100 text-blue-700"
              onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "preparing" })}
              onTakeover={(phone: string, active: boolean) => takeoverMutation.mutate({ phone, active })}
              actionLabel="Iniciar Preparo"
              actionVariant="primary"
              loading={updateStatusMutation.isPending}
              onPrint={handlePrint}
              onCancel={(order: Order) => setOrderToCancel(order)}
            />

            {/* COLUNA 2: PREPARANDO */}
            <OrderColumn
              title="Em Preparo"
              subtitle="Cozinha ativa"
              orders={getOrdersByStatus(["PREPARING"])}
              topLineColor="bg-amber-500" // <--- MUDANÇA AQUI
              statusBadgeColor="bg-amber-100 text-amber-700"
              onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "ready" })}
              onBack={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "paid" })}
              onTakeover={(phone: string, active: boolean) => takeoverMutation.mutate({ phone, active })}
              actionLabel="Marcar Pronto"
              actionVariant="warning"
              loading={updateStatusMutation.isPending}
              onPrint={handlePrint}
              onCancel={(order: Order) => setOrderToCancel(order)}
            />

            {/* COLUNA 3: PRONTO */}
            <OrderColumn
              title="Pronto / Expedição"
              subtitle="Aguardando entrega"
              orders={getOrdersByStatus(["READY"])}
              topLineColor="bg-emerald-500" // <--- MUDANÇA AQUI
              statusBadgeColor="bg-emerald-100 text-emerald-700"
              onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "completed" })}
              onBack={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "preparing" })}
              onTakeover={(phone: string, active: boolean) => takeoverMutation.mutate({ phone, active })}
              actionLabel="Finalizar"
              actionVariant="success"
              loading={updateStatusMutation.isPending}
              onPrint={handlePrint}
              onCancel={(order: Order) => setOrderToCancel(order)}
            />
          </div>
        </div>
      )}

      <TicketImpressao order={orderToPrint} />

      {/* --- MODAL DE CANCELAMENTO ESTILO SAAS --- */}
      <AlertDialog
        open={!!orderToCancel}
        onOpenChange={(open) => !open && setOrderToCancel(null)}
      >
        <AlertDialogContent className="max-w-[400px] border-slate-200">
          {/* 1. O HEADER envolve apenas o Título e a Descrição */}
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

                {/* Grid de Informações Rápidas */}
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

                {/* Resumo dos Itens */}
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

          {/* 2. O FOOTER deve estar FORA do Header mas DENTRO do Content */}
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
    </div> // Fim da PedidosPage
  );
}


// --- SUB-COMPONENTES DE DESIGN ---

function OrderColumn({ title, subtitle, orders, topLineColor, statusBadgeColor, onAction, onBack, onCancel, onTakeover, onPrint, actionLabel, actionVariant, loading }: any) {
  return (
    <div className="flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200 shadow-inner overflow-hidden relative">

      {/* --- AQUI ESTÁ A CORREÇÃO: A BARRA COLORIDA NO TOPO --- */}
      <div className={`h-1.5 w-full ${topLineColor}`} />

      {/* Column Header (Sem borda colorida, apenas a barra acima) */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
        </div>
        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
          {orders.length}
        </Badge>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-300">
        {orders.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <LayoutList className="h-10 w-10 mb-2" />
            <span className="text-sm">Vazio</span>
          </div>
        )}
        {orders.map((order: any) => (
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
}

function OrderCard({ order, onAction, onBack, onCancel, onTakeover, onPrint, actionLabel, actionVariant, disabled, badgeColor }: any) {
  const minutes = getMinutesFromDate(order.created_at);

  // --- 1. LÓGICA DE TIMER COLORIDO (RESTAURADA) ---
  let timerStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"; // Padrão (< 10 min)
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

  // --- LÓGICA DE SEGURANÇA DO BOTÃO ---
  const isPix = (order.payment_method || "").toLowerCase().includes("pix");
  const isPixPending = isPix && order.status === "PENDING";
  const isActionDisabled = disabled || isPixPending;

  let currentActionLabel = actionLabel;
  if (isPixPending) currentActionLabel = "Aguardando Pix"; // Texto curto

  const btnVariants: any = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
  };

  return (
    <div className={`group bg-white rounded-lg border shadow-sm transition-all duration-200 flex flex-col ${isPixPending ? 'border-rose-100 bg-rose-50/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>

      {/* HEADER */}
      <div className="p-3 border-b border-slate-100/50 flex justify-between items-start">
        <div className="flex flex-col gap-2 w-full">

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-700">#{order.id}</span>
              {/* TIMER COM CORES */}
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
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {order.type === "DELIVERY" ? (
              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-md border border-sky-100 uppercase tracking-wide">
                <Bike className="w-3.5 h-3.5" /> Entrega
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-md border border-orange-100 uppercase tracking-wide">
                <ShoppingBag className="w-3.5 h-3.5" /> Retirada
              </div>
            )}
            <PaymentStatusBadge method={order.payment_method} status={order.status} />
          </div>
        </div>
      </div>

      {/* ITEMS - VERSÃO COM PREÇO DISCRIMINADO */}
      <div className="p-3 flex-1 space-y-3">
        {order.display_items.map((item: any, idx: number) => (
          <div key={idx} className="flex items-start gap-3 text-sm">
            {/* Badge da Quantidade */}
            <div className="font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 h-6 flex items-center justify-center min-w-[24px] text-xs">
              {item.quantity}x
            </div>

            <div className="flex flex-col w-full">
              {/* Linha do Nome + Preço */}
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-slate-800 leading-snug uppercase text-sm">
                  {item.product_name}
                </span>

                {/* PREÇO: Menor (text-[11px]) e mais cinza (text-slate-400) */}
                {item.price_at_time_of_order && (
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap ml-2">
                    {(item.price_at_time_of_order * item.quantity).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                )}
              </div>

              {/* Observações do Item (se houver) */}
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
          {/* TAXA DE ENTREGA - Agora usando o dado real do banco */}
          {order.type === "DELIVERY" && (
            <div className="flex justify-between items-center px-2 py-1 bg-sky-50/50 rounded border border-sky-100/50 mb-2">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-tight">Taxa de Entrega</span>
              <span className="text-[11px] font-bold text-sky-700">
                {/* Usamos o delivery_fee que você adicionou ao crud.py */}
                {(order as any).delivery_fee?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00"}
              </span>
            </div>
          )}

          {/* EXIBIÇÃO DO TOTAL DO PEDIDO */}
          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total do Pedido</span>
            <span className="text-sm font-black text-slate-900">
              {order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          {/* LInha Cliente + Ferramentas */}
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
              <button onClick={onPrint} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* --- 2. ENDEREÇO (REINCLUÍDO AQUI) --- */}
          {order.type === "DELIVERY" && order.fullAddress && (
            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-100">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-tight line-clamp-2">{order.fullAddress}</span>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 h-9">
          {onBack && (
            <button onClick={onBack} disabled={disabled} className="px-3 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
              <Undo2 className="w-4 h-4" />
            </button>
          )}

          {/* --- 3. BOTÃO CANCELAR MANUAL (NOVO) --- */}
          {onCancel && order.status !== "CANCELED" && order.status !== "COMPLETED" && (
            <button
              onClick={onCancel} // <--- Agora chama apenas a função que abre o seu Modal
              disabled={disabled}
              className="px-3 rounded-md bg-white border border-rose-200 text-rose-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-all"
              title="Cancelar Pedido"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onAction}
            disabled={isActionDisabled}
            className={`flex-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
                ${isActionDisabled
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : `${btnVariants[actionVariant]} active:scale-[0.98]`
              }`}
          >
            {isPixPending && <Clock className="w-3 h-3 animate-spin" />}
            {currentActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- UTILS & PRINT ---

function getMinutesFromDate(dateString: string) {
  if (!dateString) return 0;
  const utcString = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
  const start = new Date(utcString).getTime();
  const now = new Date().getTime();
  return Math.floor((now - start) / 60000);
}

function calculateTimeElapsed(dateString: string) {
  const diff = getMinutesFromDate(dateString);
  if (diff < 0) return "0m";
  if (diff < 60) return `${diff}m`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
}

function TicketImpressao({ order }: { order: Order | null }) {
  if (!order) return null;

  return (
    <div id="printable-area" className="hidden print:block w-[80mm] p-0 font-mono text-black text-[12px] leading-tight">
      <div className="text-center border-b border-black pb-2 mb-2">
        <h2 className="text-2xl font-black">#{order.id}</h2>
        <p className="text-[10px]">{new Date().toLocaleString('pt-BR')}</p>
        <p className="font-bold text-sm mt-1 uppercase">{order.customerName}</p>
      </div>

      <div className="mb-2">
        <p className="font-bold uppercase border-b border-black inline-block mb-1">
          {order.type === "DELIVERY" ? "🛵 ENTREGA" : "👜 RETIRADA"}
        </p>
        {order.type === "DELIVERY" && order.fullAddress && (
          <p className="text-[10px] mt-1">{order.fullAddress}</p>
        )}
      </div>

      <div className="border-b-2 border-dashed border-black pb-2 mb-2">
        {order.display_items.map((item, idx) => (
          <div key={idx} className="mb-2">
            <div className="flex justify-between items-start gap-2">
              <div className="flex gap-2">
                <span className="font-bold">{item.quantity}x</span>
                <span className="uppercase font-semibold">{item.product_name}</span>
              </div>
              {/* PREÇO UNITÁRIO X QTD NO TICKET */}
              {item.price_at_time_of_order && (
                <span className="font-bold whitespace-nowrap">
                  {(item.price_at_time_of_order * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            {item.notes && (
              <p className="text-[10px] font-black ml-6 mt-0.5 bg-black text-white inline-block px-1 uppercase">
                OBS: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>
      {/* RESUMO FINANCEIRO NO TICKET */}
      <div className="space-y-1 mb-2 border-b border-black pb-2">
        <div className="flex justify-between text-[10px]">
          <span>SUBTOTAL:</span>
          <span>{order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="flex justify-between font-black text-sm">
          <span>TOTAL GERAL:</span>
          <span>{order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="mt-1 text-[10px] text-center border border-black p-1">
          MÉTODO: <span className="font-black uppercase">{order.payment_method || 'A DEFINIR'}</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <p className="text-[10px]">*** FIM DO PEDIDO ***</p>
      </div>
    </div>
  );
}

// --- COMPONENTE DE STATUS DE PAGAMENTO (NOVO) ---
function PaymentStatusBadge({ method, status }: { method?: string | null, status: string }) {
  const methodClean = (method || "").toLowerCase();
  const isPix = methodClean.includes("pix");

  // 1. Lógica PIX
  if (isPix) {
    if (status === "PENDING") {
      // Estilo: Alerta Vermelho Suave (Piscando)
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 shadow-sm animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
            Aguardando Pix
          </span>
        </div>
      );
    }
    // Se não é PENDING (PAID, PREPARING, etc), assumimos pago
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
          Pix Pago
        </span>
      </div>
    );
  }

  // 2. Cartão (Paga na entrega/retirada)
  if (["card", "cartao", "cartão", "credito", "debito"].some(k => methodClean.includes(k))) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 shadow-sm">
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
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 shadow-sm">
        <Banknote className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          Dinheiro
        </span>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-400">
      <span className="text-[10px] font-bold uppercase">? Verificar</span>
    </div>
  );
}

// Componente SVG do WhatsApp (padrão Bootstrap Icons)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
      className={className}
    >
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.601 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
    </svg>
  );
}