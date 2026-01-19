"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BotSelector } from "@/components/ui/bot-selector";
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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- Tipos ---
type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELED";

interface OrderItem {
  quantity: number;
  product_name: string;
  notes?: string | null;
}

interface Order {
  id: number;
  total_amount: number;
  status: OrderStatus;
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

        if (data.type === 'new_order') {
          console.log("🔔 Novo Pedido:", data.payload);
          queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
          toast({ 
            title: "Novo Pedido na Cozinha! 👨‍🍳", 
            description: `Cliente: ${data.payload.customer_name}`,
            className: "bg-slate-900 text-white border-slate-800"
          });
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
      audioRef.current?.play().catch(() => {});
    }
    previousPendingCount.current = currentCount;
  }, [orders, soundEnabled]);

  const toggleSound = () => {
    if (!soundEnabled) audioRef.current?.play().catch(() => {});
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
    <div className="h-[calc(100vh-80px)] flex flex-col bg-slate-50/50">
      
      {/* --- HEADER --- */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg">
            <ChefHat className="h-6 w-6 text-white" /> 
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">KDS Cozinha</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
                {isConnected ? "Sistema Online" : "Desconectado"}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button
                onClick={toggleSound}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    soundEnabled 
                    ? "bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50" 
                    : "bg-slate-100 text-slate-400 border-transparent"
                }`}
            >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <BotSelector 
                selectedBotId={selectedBotId} 
                onBotChange={setSelectedBotId} 
            />
        </div>
      </header>

      {/* --- BOARD KANBAN --- */}
      {!selectedBotId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
          <ChefHat className="h-16 w-16 opacity-20" />
          <p>Selecione um restaurante acima para visualizar os pedidos.</p>
        </div>
      ) : isLoadingOrders ? (
         <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <Skeleton key={i} className="h-[500px] w-full rounded-xl" />)}
         </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="h-full p-6 grid grid-cols-1 md:grid-cols-3 gap-6 min-w-[1000px]">
            
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
            />
          </div>
        </div>
      )}
      
      <TicketImpressao order={orderToPrint} />
    </div>
  );
}

// --- SUB-COMPONENTES DE DESIGN ---

function OrderColumn({ title, subtitle, orders, topLineColor, statusBadgeColor, onAction, onBack, onTakeover, onPrint, actionLabel, actionVariant, loading }: any) {
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

function OrderCard({ order, onAction, onBack, onTakeover, onPrint, actionLabel, actionVariant, disabled, badgeColor }: any) {
  const minutes = getMinutesFromDate(order.created_at);
  
  // Lógica de Timer visual (Mais sutil)
  let timerClass = "bg-slate-100 text-slate-600";
  if (minutes > 20) timerClass = "bg-red-50 text-red-600 border-red-100 animate-pulse";
  else if (minutes > 10) timerClass = "bg-amber-50 text-amber-600 border-amber-100";

  // Variantes de Botão
  const btnVariants: any = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-md",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white"
  };

  return (
    <div className="group bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col">
      
      {/* CARD HEADER */}
      <div className="p-3 border-b border-slate-100 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-slate-800 tracking-tight">#{order.id}</span>
            <div className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 border border-transparent ${timerClass}`}>
              <Clock className="w-3 h-3" />
              {order.timeElapsed}
            </div>
          </div>
          {/* Tipo de Pedido */}
          <div className="flex items-center gap-1">
             {order.type === "DELIVERY" ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                    <Bike className="w-3 h-3" /> Entrega
                </div>
             ) : (
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">
                    <ShoppingBag className="w-3 h-3" /> Retirada
                </div>
             )}
          </div>
        </div>

        {/* Ferramentas do Card */}
        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <button onClick={onPrint} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Imprimir">
                <Printer className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            <div title="Atendimento Humano">
              <Switch
                  className="scale-75 data-[state=checked]:bg-blue-600"
                  checked={order.human_takeover_active}
                  onCheckedChange={(checked) => onTakeover(order.customer_phone, checked)}
              />
            </div>
        </div>
      </div>

      {/* CARD BODY (ITEMS) */}
      <div className="p-3 flex-1">
        <div className="space-y-3">
          {order.display_items.map((item: OrderItem, idx: number) => (
            <div key={idx} className="flex items-start gap-3 text-sm">
              {/* Quantidade em destaque */}
              <div className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded min-w-[28px] h-[28px] flex items-center justify-center shrink-0">
                {item.quantity}
              </div>
              
              <div className="flex flex-col w-full">
                <span className="font-semibold text-slate-800 leading-tight uppercase">
                    {item.product_name}
                </span>
                
                {/* OBSERVAÇÃO CRÍTICA */}
                {item.notes && (
                  <div className="mt-1.5 bg-red-50 border border-red-100 text-red-700 p-2 rounded text-xs font-semibold flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="uppercase tracking-wide">{item.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CARD FOOTER (Customer Info + Actions) */}
      <div className="bg-slate-50 p-3 border-t border-slate-100">
        
        {/* Info Cliente (Minimalista) */}
        <div className="mb-3 flex items-start gap-2 text-xs text-slate-500">
            <User className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
            <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-slate-700 truncate" title={order.customerName}>
                    {order.customerName || "Cliente"}
                </span>
                {order.type === "DELIVERY" && order.fullAddress && (
                    <span className="text-[10px] leading-tight line-clamp-2 mt-0.5 text-slate-400">
                        {order.fullAddress}
                    </span>
                )}
            </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
            {onBack && (
              <button
                onClick={onBack}
                disabled={disabled}
                className="px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shadow-sm"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onAction}
              disabled={disabled}
              className={`flex-1 py-2 px-4 rounded-md text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] ${btnVariants[actionVariant]}`}
            >
              {disabled ? "..." : actionLabel}
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
          <div key={idx} className="mb-3">
            <div className="flex gap-2 items-start">
              <span className="font-bold text-lg">{item.quantity}</span>
              <span className="text-sm uppercase font-semibold">{item.product_name}</span>
            </div>
            {item.notes && (
              <p className="text-xs font-black ml-6 mt-0.5 bg-black text-white inline-block px-1 uppercase">
                OBS: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="text-center mt-4">
        <p className="text-[10px]">*** FIM DO PEDIDO ***</p>
      </div>
    </div>
  );
}