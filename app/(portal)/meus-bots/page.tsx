"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Bot as BotIcon, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditBotSheet } from "./edit-bot-sheet"; // Certifique-se que o caminho está certo
import { BotCard } from "@/components/ui/bot-card"; // O componente novo acima
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function MyBotsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedBot, setSelectedBot] = useState<any | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // 1. Fetch Bots
  const { data: bots, isLoading } = useQuery({
    queryKey: ["myBots"],
    queryFn: async () => {
      const res = await api.get(`${API_BASE}/bots`);
      return res.data;
    },
  });

  // 2. Toggle Status (Abrir/Fechar Loja Rápido)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: boolean }) => {
      // Endpoint simplificado de patch ou usando o update completo
      return api.put(`${API_BASE}/bots/${id}`, { 
        // Nota: Idealmente seu backend teria um PATCH /bots/{id}/status
        // Aqui estamos assumindo que o PUT precisa de todos os dados, 
        // mas num cenário real faremos um PATCH otimizado.
        // Se seu backend exigir tudo, você precisaria buscar o bot completo antes.
        // Vou assumir que o backend aceita partial update ou você tem uma rota específica.
        is_open: status 
        // ... (resto dos dados se necessário)
      }); 
      // OBS: Se o seu PUT atual exige TODOS os campos (nome, token, etc), 
      // essa chamada vai falhar se não passarmos tudo. 
      // RECOMENDAÇÃO: Crie uma rota PATCH no backend apenas para status.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      toast({ description: "Status da loja atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" });
    }
  });

  const handleEdit = (bot: any) => {
    setSelectedBot(bot);
    setIsEditSheetOpen(true);
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    // Para simplificar o front, assumindo que vamos implementar o PATCH ou 
    // que o usuário vai editar pelo menu de configurações se o PUT for estrito.
    // Mas para a UI funcionar visualmente:
    console.log("Toggle status", id, !currentStatus);
    // toggleStatusMutation.mutate({ id, status: !currentStatus });
    
    // Fallback: Abrir o sheet de edição se não tiver rota PATCH pronta
    const botToEdit = bots.find((b: any) => b.id === id);
    if(botToEdit) {
        handleEdit(botToEdit); 
        toast({ description: "Use a janela lateral para alterar o status." });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Meus Bots</h1>
          <p className="text-slate-500 mt-1">Gerencie seus assistentes virtuais e conexões.</p>
        </div>
        
        <div className="flex gap-3">
            <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                <Link href="/bots/novo">
                    <Plus className="mr-2 h-4 w-4" /> Novo Bot
                </Link>
            </Button>
        </div>
      </div>

      {/* GRID DE CARDS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[280px] w-full rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : bots?.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <div className="bg-white p-4 rounded-full shadow-sm inline-flex mb-4">
             <BotIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Nenhum bot criado</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Comece criando seu primeiro assistente para atender seus clientes no WhatsApp.
          </p>
          <Button asChild variant="outline">
            <Link href="/bots/novo">Criar meu primeiro Bot</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot: any) => (
            <BotCard 
                key={bot.id} 
                bot={bot} 
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* SHEET DE EDIÇÃO */}
      <EditBotSheet
        bot={selectedBot}
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
      />
    </div>
  );
}