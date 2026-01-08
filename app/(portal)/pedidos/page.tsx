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
  VolumeX
} from "lucide-react";
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

  // 1. BUSCA PEDIDOS (MODIFICADO: Sem Polling)
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
    // 🔴 REMOVIDO: refetchInterval: 10000 
    // (Não precisamos mais ficar perguntando a cada 10s)
  });

  // ▼▼▼ NOVO: ESCUTA EVENTOS EM TEMPO REAL (SSE) ▼▼▼
  useEffect(() => {
    // Só conecta se tivermos um Bot selecionado (ou pode deixar global se preferir)
    // Aqui conectamos na rota /stream global
    const evtSource = new EventSource(`${API_BASE}/stream`);

    evtSource.onopen = () => console.log("🟢 Conectado ao Stream de Pedidos");

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping') return;

        if (data.type === 'new_order') {
          console.log("🔔 NOVO PEDIDO RECEBIDO VIA SSE:", data.payload);
          
          // 1. Força o React Query a atualizar a lista IMEDIATAMENTE
          // Isso fará o 'useQuery' acima rodar de novo e pegar os dados atualizados do banco
          queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
          
          // 2. Feedback Visual Rápido
          toast({ 
            title: "Novo Pedido! 🚀", 
            description: `${data.payload.customer_name} acabou de pedir.`,
            className: "bg-green-500 text-white border-none"
          });
          
          // Nota: O som tocará automaticamente porque o 'invalidateQueries' vai atualizar
          // a variável 'orders', disparando o seu useEffect de som existente abaixo.
        }
      } catch (err) {
        console.error("Erro no SSE:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.error("🔴 Erro ou desconexão no SSE", err);
      setIsConnected(false);
      
      // Opcional: Tentar reconectar manualmente após 3s se o navegador não fizer
      // Mas geralmente, ao fechar e mudar o state, o useEffect roda de novo se as dependências mudarem
      // Ou você pode deixar o navegador tentar (o EventSource nativo tem auto-retry).
    };

    return () => {
      evtSource.close();
      console.log("🔴 Desconectado do Stream");
    };
  }, [selectedBotId, queryClient, toast]);
  // ▲▲▲ FIM DO BLOCO SSE ▲▲▲


  // 2. MUTAÇÃO DE STATUS
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number, newStatus: string }) => {
      return api.patch(`${API_BASE}/bots/${selectedBotId}/orders/${orderId}`, {
        status: newStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
      queryClient.invalidateQueries({ queryKey: ['myBots'] });
      toast({ title: "Pedido atualizado!" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" })
  });

  // 3. MUTAÇÃO DE TAKEOVER
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

  // --- LÓGICA DO ALERTA SONORO (Mantida igual) ---
  useEffect(() => {
    audioRef.current = new Audio("/sounds/bell.mp3");
  }, []);

  useEffect(() => {
    if (!orders) return;

    const pendingOrders = orders.filter(o => ["PENDING", "PAID"].includes(o.status));
    const currentCount = pendingOrders.length;

    // A mágica acontece aqui: Quando o SSE chama 'invalidateQueries', o 'orders' muda,
    // este useEffect roda, percebe que currentCount aumentou e toca o som.
    if (currentCount > previousPendingCount.current && soundEnabled) {
      audioRef.current?.play().catch(error => {
        console.log("Autoplay bloqueado pelo navegador:", error);
      });
      
      // Toast de reforço (opcional, já tem o do SSE, mas este confirma que entrou na lista)
    }

    previousPendingCount.current = currentCount;
  }, [orders, soundEnabled, toast]);

  // Função para alternar o som
  const toggleSound = () => {
    if (!soundEnabled) {
      audioRef.current?.play().catch(() => {});
      toast({ title: "Som Ativado 🔊", description: "Você será avisado de novos pedidos." });
    } else {
      toast({ title: "Som Desativado 🔇" });
    }
    setSoundEnabled(!soundEnabled);
  };

  // NOVA FUNÇÃO DE IMPRESSÃO
  const handlePrint = (order: Order) => {
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getOrdersByStatus = (statusList: OrderStatus[]) => {
    const filtered = orders?.filter((order) => statusList.includes(order.status)) || [];
    return filtered.sort((a, b) => a.id - b.id);
  };

  return (
    // ... (O RESTO DO SEU JSX CONTINUA EXATAMENTE IGUAL) ...
    // Vou omitir o JSX para economizar espaço, pois não precisamos mudar nada no visual.
    // Apenas copie e cole o return original aqui.
    <div className="h-[calc(100vh-100px)] flex flex-col pb-4">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LayoutList className="h-8 w-8 text-primary" /> 
          Painel de Cozinha
        </h1>
        
        {/* Container da direita com Botão de Som e Seletor */}
        <div className="flex items-center gap-3">
            <button
                onClick={toggleSound}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                    soundEnabled 
                    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" 
                    : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                }`}
                title={soundEnabled ? "Desativar alertas sonoros" : "Ativar alertas sonoros"}
            >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                <span className="text-sm font-semibold hidden sm:inline">
                    {soundEnabled ? "Som Ligado" : "Som Mudo"}
                </span>
            </button>

            <BotSelector 
                selectedBotId={selectedBotId} 
                onBotChange={setSelectedBotId} 
            />
        </div>
      </div>

      {/* --- CONTEÚDO --- */}
      {!selectedBotId ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <BotSelector selectedBotId={selectedBotId} onBotChange={setSelectedBotId} className="hidden" />
          Selecione um bot para ver os pedidos.
        </div>
      ) : isLoadingOrders ? (
         <div className="p-8 space-y-4">
             <Skeleton className="h-10 w-full" />
             <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
             </div>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-hidden">
          
          {/* COLUNA 1: FILA */}
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
            onPrint={handlePrint}
          />

          {/* COLUNA 2: EM PREPARO */}
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
            onPrint={handlePrint}
          />

          {/* COLUNA 3: PRONTO */}
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
            onPrint={handlePrint}
          />
        </div>
      )}
      
      {/* COMPONENTE INVISÍVEL DE IMPRESSÃO */}
      <TicketImpressao order={orderToPrint} />
    </div>
  );
}

// ... (Mantenha os componentes OrderColumn, OrderCard e TicketImpressao exatamente como estão)
function OrderColumn({ title, orders, color, badgeColor, onAction, onBack, onTakeover, onPrint, actionLabel, actionColor, loading }: any) {
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
            onBack={onBack ? () => onBack(order.id) : undefined}
            onTakeover={onTakeover}
            onPrint={() => onPrint(order)}
            actionLabel={actionLabel}
            actionColor={actionColor}
            disabled={loading}
          />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onAction, onBack, onTakeover, onPrint, actionLabel, actionColor, disabled }: any) {
  const minutes = getMinutesFromDate(order.created_at);
  let timerColor = "bg-green-100 text-green-700 border-green-200";
  if (minutes > 20) timerColor = "bg-red-100 text-red-700 border-red-200 animate-pulse";
  else if (minutes > 10) timerColor = "bg-yellow-100 text-yellow-700 border-yellow-200";

  const borderClass = order.type === "DELIVERY" ? "border-l-blue-500" : "border-l-orange-500";

  return (
    <div className={`bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all border-l-[6px] ${borderClass} mb-2`}>

      {/* 1. TOPO: Mantido igual */}
      <div className="flex justify-between items-center bg-gray-50 px-2 py-1.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg text-gray-800">#{order.id}</span>
          <div className={`px-1.5 py-0.5 rounded border text-xs font-mono font-bold flex items-center gap-1 ${timerColor}`}>
            <Clock className="w-3.5 h-3.5" />
            {order.timeElapsed}
          </div>
        </div>

        <div className="flex items-center gap-1">
            <button 
                onClick={onPrint}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                title="Imprimir Ticket"
            >
                <Printer className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            {order.human_takeover_active ? <User className="w-4 h-4 text-blue-600" /> : <Bot className="w-4 h-4 text-green-600" />}
            <Switch
                className="scale-75"
                checked={order.human_takeover_active}
                onCheckedChange={(checked) => onTakeover(order.customer_phone, checked)}
            />
        </div>
      </div>

      {/* 2. DADOS DO CLIENTE (AJUSTADO) */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cliente</span>
                {order.type === "DELIVERY" ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-blue-100 text-blue-800 border-blue-200 font-bold"><Bike className="w-3 h-3 mr-1" /> ENTREGA</Badge>
                ) : (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] bg-orange-100 text-orange-800 border-orange-200 font-bold"><ShoppingBag className="w-3 h-3 mr-1" /> BALCÃO</Badge>
                )}
            </div>
            
            {/* ▼▼▼ MUDANÇA AQUI ▼▼▼ */}
            {/* Reduzido de 'text-lg font-black' para 'text-sm font-bold' */}
            <span className="font-bold text-sm text-gray-900 leading-tight mb-0.5 truncate" title={order.customerName}>
                {order.customerName || "Cliente sem nome"}
            </span>
            {/* ▲▲▲ FIM DA MUDANÇA ▲▲▲ */}

            <a 
              href={`https://wa.me/${order.customer_phone}`} 
              target="_blank" 
              rel="noreferrer"
              // Link é text-[11px], o nome acima agora é text-sm (14px). Diferença sutil e elegante.
              className="flex items-center gap-1 text-[11px] text-green-600 hover:underline font-medium"
            >
              <MessageCircle className="w-3 h-3" />
              {order.customer_phone}
            </a>
        </div>
      </div>

      {/* 3. ENDEREÇO */}
      {order.type === "DELIVERY" && order.fullAddress && (
        <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-100 flex items-start gap-2">
            <MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
            <span className="text-xs font-medium text-slate-700 leading-tight line-clamp-2">
                {order.fullAddress}
            </span>
        </div>
      )}

      {/* 4. LISTA DE ITENS */}
      <div className="p-0 flex-1 overflow-y-auto scrollbar-thin bg-white min-h-[50px] max-h-[250px]">
        {order.display_items.map((item: OrderItem, idx: number) => (
          <div key={idx} className="flex items-center px-3 py-2 border-b border-dashed border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
            <div className="font-black mr-3 min-w-[30px] h-[30px] flex items-center justify-center text-lg text-gray-800 bg-gray-100 rounded border border-gray-200 shrink-0">
              {item.quantity}
            </div>
            <div className="flex flex-col justify-center">
                <span className="font-bold text-base text-gray-800 uppercase leading-tight">
                {item.product_name}
                </span>
            </div>
          </div>
        ))}
      </div>

      {/* 5. RODAPÉ */}
      <div className="flex border-t border-gray-200">
        {onBack && (
          <button
            onClick={onBack}
            disabled={disabled}
            className="px-3 bg-gray-50 hover:bg-gray-200 text-gray-500 transition-colors border-r border-gray-200"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onAction}
          disabled={disabled}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest text-white transition-all shadow-inner ${actionColor} disabled:opacity-50 hover:brightness-110 active:scale-[0.98]`}
        >
          {disabled ? "..." : actionLabel}
        </button>
      </div>
    </div>
  );
}

// --- Funções Auxiliares ---

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

function TicketImpressao({ order }: { order: Order | null }) {
  if (!order) return null;

  return (
    <div id="printable-area" className="hidden print:block w-[80mm] p-2 font-mono text-black">
      {/* CABEÇALHO */}
      <div className="text-center border-b-2 border-dashed border-black pb-2 mb-2">
        <h2 className="text-xl font-black uppercase">SENHA: #{order.id}</h2>
        <p className="text-xs">{new Date().toLocaleString('pt-BR')}</p>
        <p className="font-bold text-lg mt-1">{order.customerName}</p>
      </div>

      {/* TIPO E ENDEREÇO */}
      <div className="mb-2 text-sm">
        <p className="font-bold">
          {order.type === "DELIVERY" ? "🛵 ENTREGA" : "👜 RETIRADA"}
        </p>
        {order.type === "DELIVERY" && order.fullAddress && (
          <p className="text-xs leading-tight mt-1">{order.fullAddress}</p>
        )}
      </div>

      {/* ITENS */}
      <div className="border-b-2 border-dashed border-black pb-2 mb-2">
        {order.display_items.map((item, idx) => (
          <div key={idx} className="flex gap-2 mb-1 items-start">
            <span className="font-bold text-lg">{item.quantity}x</span>
            <span className="text-sm uppercase leading-tight mt-0.5">{item.product_name}</span>
          </div>
        ))}
      </div>

      {/* RODAPÉ */}
      <div className="text-center mt-4">
        <p className="text-xs">=== FIM DO PEDIDO ===</p>
      </div>
    </div>
  );
}