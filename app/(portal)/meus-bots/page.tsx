"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Bot as BotIcon, Settings, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EditBotSheet } from "./edit-bot-sheet"; // Certifique-se de que este arquivo existe na mesma pasta

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

// Interface para tipagem
interface Bot {
  id: number;
  restaurant_name: string;
  whatsapp_number: string;
  whatsapp_token?: string;
  phone_number_id?: string;
  is_open: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function MeusBotsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Estados para controlar Modais e Sheets
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);

  // 1. Busca Bots
  const { data: bots, isLoading, error } = useQuery<Bot[]>({
    queryKey: ["myBots"],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/bots`);
      return response.data;
    },
  });

  // 2. Mutação de Delete
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      return api.delete(`${API_BASE}/bots/${botId}`);
    },
    onSuccess: () => {
      toast({ title: "Bot excluído", description: "O bot e todos os seus dados foram removidos." });
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      setBotToDelete(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o bot.", variant: "destructive" });
      setBotToDelete(null);
    },
  });

  // 3. Mutação: Abrir/Fechar Loja (Switch)
  const toggleStoreMutation = useMutation({
    mutationFn: async ({ bot, isOpen }: { bot: Bot; isOpen: boolean }) => {
      // Precisamos enviar os outros dados obrigatórios no PUT ou o backend pode reclamar,
      // dependendo de como o schema foi feito (se for partial, só is_open basta).
      // Por segurança, enviamos o payload conforme sua rota de update espera.
      return api.put(`${API_BASE}/bots/${bot.id}`, {
        restaurant_name: bot.restaurant_name,
        whatsapp_number: bot.whatsapp_number,
        whatsapp_token: bot.whatsapp_token,
        phone_number_id: bot.phone_number_id,
        is_open: isOpen,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      const status = variables.isOpen ? "ABERTA 🟢" : "FECHADA 🔴";
      toast({ title: `Loja ${status}`, description: "O status do bot foi atualizado." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao atualizar status da loja.", variant: "destructive" });
    },
  });

  // Handler para clicar no Card (Abre Edição)
  const handleCardClick = (bot: Bot) => {
    setEditingBot(bot);
  };

  if (isLoading)
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );

  if (error) return <div className="p-8 text-red-500">Falha ao buscar bots: {(error as any).message}</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seus Bots</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus assistentes de atendimento.</p>
        </div>

        <Button asChild>
          <Link href="/bots/novo">
            <Plus className="mr-2 h-4 w-4" />
            Criar Novo Bot
          </Link>
        </Button>
      </div>

      {/* LISTAGEM DE BOTS */}
      {bots && bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-gray-50">
          <BotIcon className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Você ainda não tem nenhum bot.</p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/bots/novo">Criar o primeiro agora</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots?.map((bot) => (
            <Card
              key={bot.id}
              onClick={() => handleCardClick(bot)}
              className={`hover:shadow-lg transition-all cursor-pointer group border-l-4 relative ${
                bot.is_open ? "border-l-green-500" : "border-l-red-300 bg-gray-50/50"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {bot.restaurant_name}
                      {!bot.is_open && (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                          FECHADO
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-500 font-mono">{bot.whatsapp_number}</p>
                  </div>

                  {/* Botão de Delete (Com stopPropagation para não abrir o edit) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setBotToDelete(bot);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MessageSquare className="w-4 h-4" />
                  <span>ID do Sistema: {bot.id}</span>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t bg-gray-50/50 flex justify-between items-center rounded-b-lg">
                {/* Switch de Abrir/Fechar (Com stopPropagation) */}
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Switch
                    checked={bot.is_open}
                    onCheckedChange={(checked) => toggleStoreMutation.mutate({ bot, isOpen: checked })}
                    disabled={toggleStoreMutation.isPending}
                  />
                  <span className={`text-xs font-medium ${bot.is_open ? "text-green-700" : "text-gray-500"}`}>
                    {bot.is_open ? "Loja Aberta" : "Fechada"}
                  </span>
                </div>

                <div className="flex items-center text-gray-400 group-hover:text-primary transition-colors text-xs font-medium gap-1">
                  <Settings className="w-3 h-3" /> Editar
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* COMPONENT DE EDIÇÃO (SHEET) */}
      <EditBotSheet 
        bot={editingBot} 
        isOpen={!!editingBot} 
        onClose={() => setEditingBot(null)} 
      />

      {/* Modal de Confirmação (Delete) */}
      <AlertDialog open={!!botToDelete} onOpenChange={(isOpen) => !isOpen && setBotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o bot
              <strong className="px-1 text-foreground">{botToDelete?.restaurant_name}</strong>e todo o seu histórico de
              conversas, produtos e pedidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => botToDelete && deleteBotMutation.mutate(botToDelete.id)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteBotMutation.isPending}
            >
              {deleteBotMutation.isPending ? "Excluindo..." : "Sim, excluir bot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}