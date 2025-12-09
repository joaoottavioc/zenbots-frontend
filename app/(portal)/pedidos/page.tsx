// app/(portal)/pedidos/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; 
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
// Importe o Undo2 para o ícone de voltar
import { Clock, Bike, ShoppingBag, MessageCircle, Bot, User, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- Tipos ---
type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELED";

interface OrderItem {
  quantity: number;
  product_name: string;
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
  type?: "DELIVERY" | "PICKUP";
}

interface Bot {
  id: number;
  restaurant_name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function PedidosPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. Busca Bots
  const { data: bots, isLoading: isLoadingBots } = useQuery<Bot[]>({
    queryKey: ['myBots'],
    queryFn: async () => (await api.get(`${API_BASE}/bots`)).data,
  });

  useEffect(() => {
    if (bots && bots.length === 1) setSelectedBotId(String(bots[0].id));
  }, [bots]);

  // 2. BUSCA PEDIDOS
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ['orders', selectedBotId],
    queryFn: async () => {
      const res = await api.get(`${API_BASE}/bots/${selectedBotId}/orders`);
      return res.data.map((order: any) => ({
        ...order,
        status: order.status.toUpperCase(), 
        timeElapsed: calculateTimeElapsed(order.created_at),
        customerName: order.customer_address ? "Cliente Delivery" : "Cliente Retirada", 
        type: order.customer_address ? "DELIVERY" : "PICKUP"
      }));
    },
    enabled: !!selectedBotId,
    refetchInterval: 10000, 
  });

  // 3. MUTAÇÃO DE STATUS
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number, newStatus: string }) => {
      return api.patch(`${API_BASE}/bots/${selectedBotId}/orders/${orderId}`, {
        status: newStatus 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
      toast({ title: "Pedido atualizado!" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" })
  });

  // 4. MUTAÇÃO DE TAKEOVER
  const takeoverMutation = useMutation({
    mutationFn: async ({ phone, active }: { phone: string, active: boolean }) => {
      const action = active ? "activate" : "deactivate";
      return api.post(`${API_BASE}/takeover/${selectedBotId}/${phone}/${action}`);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
      const status = variables.active ? "Ativado (Humano)" : "Desativado (Bot)";
      toast({ title: `Atendimento manual ${status}` });
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Erro ao alterar modo", description: "Verifique se o telefone é válido.", variant: "destructive" });
    }
  });

  const getOrdersByStatus = (statusList: OrderStatus[]) => 
    orders?.filter((order) => statusList.includes(order.status)) || [];

  if (isLoadingBots) return <div className="p-8"><Skeleton className="h-10 w-60" /></div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Painel de Cozinha</h1>
        {bots && bots.length > 1 && (
          <Select onValueChange={setSelectedBotId} value={selectedBotId ?? undefined}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Selecione um bot..." />
            </SelectTrigger>
            <SelectContent>
              {bots.map(bot => (
                <SelectItem key={bot.id} value={String(bot.id)}>{bot.restaurant_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {!selectedBotId ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Selecione um bot para ver os pedidos.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 h-full overflow-hidden">
          
          {/* COLUNA 1: FILA */}
          {/* Avançar: preparing */}
          <OrderColumn 
            title="Fila / A Fazer" 
            orders={getOrdersByStatus(["PENDING", "PAID"])} 
            color="bg-blue-50 border-blue-200" 
            badgeColor="bg-blue-500"
            onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "preparing" })}
            onTakeover={(phone: string, active: boolean) => takeoverMutation.mutate({ phone, active })}
            actionLabel="▶ Iniciar Preparo"
            actionColor="bg-blue-600 hover:bg-blue-700"
            loading={updateStatusMutation.isPending}
          />

          {/* COLUNA 2: EM PREPARO */}
          {/* Avançar: ready | Voltar: paid */}
          <OrderColumn 
            title="Em Preparação" 
            orders={getOrdersByStatus(["PREPARING"])} 
            color="bg-yellow-50 border-yellow-200"
            badgeColor="bg-yellow-500"
            onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "ready" })}
            onBack={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "paid" })}
            onTakeover={(phone: string, active: boolean) => takeoverMutation.mutate({ phone, active })}
            actionLabel="✔ Marcar Pronto"
            actionColor="bg-yellow-600 hover:bg-yellow-700"
            loading={updateStatusMutation.isPending}
          />

          {/* COLUNA 3: PRONTO */}
          {/* Avançar: completed | Voltar: preparing */}
          <OrderColumn 
            title="Pronto / Expedição" 
            orders={getOrdersByStatus(["READY"])} 
            color="bg-green-50 border-green-200"
            badgeColor="bg-green-500"
            onAction={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "completed" })}
            onBack={(id: number) => updateStatusMutation.mutate({ orderId: id, newStatus: "preparing" })}
            onTakeover={(phone: string, active: boolean) => takeoverMutation.mutate({ phone, active })}
            actionLabel="Concluir (Arquivar)"
            actionColor="bg-green-600 hover:bg-green-700"
            loading={updateStatusMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}

// --- Componentes Auxiliares ---

function OrderColumn({ title, orders, color, badgeColor, onAction, onBack, onTakeover, actionLabel, actionColor, loading }: any) {
  return (
    <div className={`flex flex-col rounded-xl border-2 p-2 ${color} h-full overflow-hidden`}>
      <div className="flex items-center justify-between mb-2 px-2 shrink-0">
        <h2 className="font-bold text-gray-700">{title}</h2>
        <Badge className={`${badgeColor} text-white hover:${badgeColor}`}>
          {orders.length}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-2 scrollbar-thin">
        {orders.length === 0 && <div className="h-32 flex items-center justify-center text-gray-400 text-sm italic">Sem pedidos aqui</div>}
        {orders.map((order: any) => (
          <OrderCard 
            key={order.id} 
            order={order} 
            onAction={() => onAction(order.id)}
            // Passa a função onBack apenas se ela existir
            onBack={onBack ? () => onBack(order.id) : undefined} 
            onTakeover={onTakeover}
            actionLabel={actionLabel}
            actionColor={actionColor}
            disabled={loading}
          />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onAction, onBack, onTakeover, actionLabel, actionColor, disabled }: any) {
  const minutes = getMinutesFromDate(order.created_at);
  let timerColor = "bg-green-100 text-green-700 border-green-200"; 
  if (minutes > 20) timerColor = "bg-red-100 text-red-700 border-red-200 animate-pulse"; 
  else if (minutes > 10) timerColor = "bg-yellow-100 text-yellow-700 border-yellow-200";

  const borderClass = order.type === "DELIVERY" ? "border-l-blue-500" : "border-l-orange-500"; 

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all border-l-[6px] ${borderClass}`}>
      
      {/* 1. TOPO */}
      <div className="flex justify-between items-center bg-gray-50 p-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
            <span className="font-black text-lg text-gray-800">#{order.id}</span>
            <div className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold flex items-center gap-1 ${timerColor}`}>
               <Clock className="w-3 h-3" />
               {order.timeElapsed}
            </div>
        </div>

        <div className="flex items-center gap-2" title={order.human_takeover_active ? "Humano no controle" : "Bot ativo"}>
             {order.human_takeover_active ? <User className="w-4 h-4 text-blue-600" /> : <Bot className="w-4 h-4 text-green-600" />}
             <Switch 
                className="scale-75"
                checked={order.human_takeover_active}
                onCheckedChange={(checked) => onTakeover(order.customer_phone, checked)}
             />
        </div>
      </div>

      {/* 2. CONTEXTO */}
      <div className="px-3 py-1.5 flex justify-between items-center border-b border-dashed border-gray-100">
          <div className="flex flex-col leading-tight">
              <span className="text-xs font-bold text-gray-800 truncate w-32" title={order.customerName || "Cliente"}>
                  {order.customerName || "Cliente"}
              </span>
              <a 
                href={`https://wa.me/${order.customer_phone}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-green-600 hover:underline"
              >
                  <MessageCircle className="w-3 h-3" />
                  {order.customer_phone}
              </a>
          </div>
          {order.type === "DELIVERY" ? (
               <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-50 text-blue-700 border-blue-100 gap-1"><Bike className="w-3 h-3"/> Moto</Badge>
          ) : (
               <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-orange-50 text-orange-700 border-orange-100 gap-1"><ShoppingBag className="w-3 h-3"/> Balcão</Badge>
          )}
      </div>

      {/* 3. ITENS */}
      <div className="p-3 flex-1 space-y-2 max-h-[150px] overflow-y-auto scrollbar-thin">
        {order.display_items.map((item: OrderItem, idx: number) => (
          <div key={idx} className="flex items-start text-sm leading-tight border-b border-dashed border-gray-100 last:border-0 pb-1 last:pb-0">
            <div className="font-black mr-2 min-w-[20px] text-sm text-gray-900 bg-gray-100 rounded px-1 text-center">
                {item.quantity}
            </div>
            <span className="font-medium text-gray-700 text-xs uppercase pt-0.5">
                {item.product_name}
            </span>
          </div>
        ))}
      </div>

      {/* 4. RODAPÉ (AÇÃO + VOLTAR) */}
      <div className="flex border-t border-gray-100">
        
        {/* Botão de Voltar (Só aparece se onBack for passado) */}
        {onBack && (
            <button
                onClick={onBack}
                disabled={disabled}
                className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors border-r border-gray-200"
                title="Voltar etapa"
            >
                <Undo2 className="w-4 h-4" />
            </button>
        )}

        {/* Botão Principal */}
        <button 
            onClick={onAction}
            disabled={disabled}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors ${actionColor} disabled:opacity-50 hover:brightness-110`}
        >
            {disabled ? "..." : actionLabel}
        </button>
      </div>
    </div>
  );
}

function getMinutesFromDate(dateString: string) {
  if (!dateString) return 0;
  const utcString = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
  const start = new Date(utcString).getTime();
  const now = new Date().getTime();
  return Math.floor((now - start) / 60000);
}

function calculateTimeElapsed(dateString: string) {
  const diff = getMinutesFromDate(dateString);
  if (diff < 0) return "0 min";
  if (diff < 60) return `${diff} min`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
}