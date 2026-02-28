"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Bot as BotIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditBotSheet } from "./edit-bot-sheet"; 
import { BotCard } from "@/components/ui/bot-card"; 
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { Bot } from "@/lib/types";
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

export default function MyBotsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Estado para controlar qual bot será deletado
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);

  // 1. Fetch Bots
  const { data: bots, isLoading, isError } = useQuery<Bot[]>({
    queryKey: ["myBots"],
    queryFn: async () => {
      const res = await api.get('/bots');
      return res.data;
    },
  });

  // 2. Toggle Status (Correção da cor do Toast aqui)
  const toggleStatusMutation = useMutation({
    mutationFn: async (bot: Bot) => {
      return api.put(`/bots/${bot.id}`, bot);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      const statusText = variables.is_open ? "ABERTA 🟢" : "FECHADA 🔴";
      
      // AJUSTE: Removido 'variant: destructive'. Agora o toast é sempre padrão (branco).
      toast({ 
        description: `Loja ${statusText}`,
        // Opcional: Adicionar uma borda vermelha sutil se quiser diferenciar sem pintar o fundo todo
        className: !variables.is_open ? "border-l-4 border-l-red-500" : "border-l-4 border-l-emerald-500"
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao atualizar status.", variant: "destructive" });
    }
  });

  // 3. Delete Bot Mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      return api.delete(`/bots/${botId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      toast({ title: "Bot deletado", description: "O assistente foi removido com sucesso." });
      setBotToDelete(null); 
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível deletar o bot.", variant: "destructive" });
    }
  });

  // 4. Disconnect Bot Mutation (Limpa as credenciais)
  const disconnectBotMutation = useMutation({
    mutationFn: async (bot: Bot) => {
      // Only send the fields needed to clear credentials — never spread the full bot object
      return api.put(`/bots/${bot.id}`, {
        restaurant_name: bot.restaurant_name,
        is_open: bot.is_open,
        phone_number_id: "",
        whatsapp_token: ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      toast({ description: "Bot desconectado. Você pode reconectar agora." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao desconectar.", variant: "destructive" });
    }
  });

  // Handlers
  const handleEdit = (bot: Bot) => {
    setSelectedBot(bot);
    setIsEditSheetOpen(true);
  };

  const handleToggleStatus = (id: number, newStatus: boolean) => {
    const botToUpdate = bots?.find((b) => b.id === id);
    if (!botToUpdate) return;
    const updatedBot = { ...botToUpdate, is_open: newStatus };
    toggleStatusMutation.mutate(updatedBot);
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Meus BotZ
          </h2>
          <p className="text-slate-500 mt-1">Crie e gerencie seus assistentes virtuais e conexões.</p>
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
      ) : isError ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-red-200">
          <h3 className="text-lg font-medium text-slate-900">Erro ao carregar bots</h3>
          <p className="text-slate-500 mb-4">Não foi possível carregar seus bots.</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['myBots'] })}>
            Tentar novamente
          </Button>
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
          {bots?.map((bot) => (
            <BotCard
                key={bot.id}
                bot={bot as { id: number; restaurant_name: string; whatsapp_number: string; is_open: boolean; phone_number_id?: string }}
                onEdit={(b) => handleEdit(b as Bot)}
                onToggleStatus={handleToggleStatus}
                onDelete={(b) => setBotToDelete(b as Bot)}
                onDisconnect={(b) => disconnectBotMutation.mutate(b as Bot)}
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

      {/* DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!botToDelete} onOpenChange={(open) => !open && setBotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação irá excluir permanentemente o bot <strong>{botToDelete?.restaurant_name}</strong> e todo o seu histórico de conversas e cardápio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => botToDelete && deleteBotMutation.mutate(botToDelete.id)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteBotMutation.isPending ? "Excluindo..." : "Sim, Excluir Bot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}