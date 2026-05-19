"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Bot as BotIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/ui/empty-state";
import { EditBotSheet } from "./edit-bot-sheet";
import { WebWidgetDialog } from "./web-widget-dialog";
import { BotCard } from "@/components/ui/bot-card";
import { BillingUsageBanner } from "@/components/ui/billing-usage-banner";
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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Atendimento Web dialog state (Phase 4 — plan/in_browser_bots.md)
  const [webWidgetBot, setWebWidgetBot] = useState<Bot | null>(null);

  // 1. Fetch Bots
  const { data: bots, isLoading, isError } = useQuery<Bot[]>({
    queryKey: ["myBots"],
    queryFn: async () => {
      const res = await api.get('/bots');
      return res.data;
    },
  });

  // 2. Toggle Status — send only is_open to avoid wiping other fields
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_open }: { id: number; is_open: boolean }) => {
      return api.put(`/bots/${id}`, { is_open });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      const statusText = variables.is_open ? "ABERTA 🟢" : "FECHADA ⚪";

      toast({
        description: `Loja ${statusText}`,
        className: !variables.is_open ? "border-l-4 border-l-slate-400" : "border-l-4 border-l-emerald-500"
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
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível deletar o bot.", variant: "destructive" });
    }
  });

  // 4. Disconnect Bot Mutation (Limpa as credenciais)
  const disconnectBotMutation = useMutation({
    mutationFn: async (bot: Bot) => {
      return api.put(`/bots/${bot.id}`, {
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
    toggleStatusMutation.mutate({ id, is_open: newStatus });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Meus BotZ"
        description="Crie e gerencie seus assistentes virtuais e conexões."
      >
        <Button asChild variant="brand">
          <Link href="/bots/novo">
            <Plus className="mr-2 h-4 w-4" /> Novo Bot
          </Link>
        </Button>
      </PageHeader>

      <BillingUsageBanner />

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
        <EmptyState
          icon={BotIcon}
          title="Nenhum bot criado"
          description="Comece criando seu primeiro assistente para atender seus clientes no WhatsApp."
          action={
            <Button asChild variant="outline">
              <Link href="/bots/novo">Criar meu primeiro Bot</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots?.map((bot) => (
            <BotCard
                key={bot.id}
                bot={bot}
                onEdit={(b) => handleEdit(b as Bot)}
                onToggleStatus={handleToggleStatus}
                onDelete={(b) => setBotToDelete(b as Bot)}
                onDisconnect={(b) => disconnectBotMutation.mutate(b as Bot)}
                onConfigureWebWidget={(b) => setWebWidgetBot(b as Bot)}
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

      {/* ATENDIMENTO WEB */}
      <WebWidgetDialog
        bot={webWidgetBot}
        open={!!webWidgetBot}
        onOpenChange={(open) => {
          if (!open) setWebWidgetBot(null);
        }}
      />

      {/* DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!botToDelete} onOpenChange={(open) => { if (!open) { setBotToDelete(null); setDeleteConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Essa ação irá excluir permanentemente o bot <strong>{botToDelete?.restaurant_name}</strong> e todo o seu histórico de conversas e cardápio.
                </p>
                <p className="text-sm">
                  Digite <span className="font-mono font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">excluir</span> para confirmar:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="excluir"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => botToDelete && deleteBotMutation.mutate(botToDelete.id)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={deleteConfirmText.toLowerCase() !== "excluir" || deleteBotMutation.isPending}
            >
              {deleteBotMutation.isPending ? "Excluindo..." : "Sim, Excluir Bot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </PageContainer>
  );
}