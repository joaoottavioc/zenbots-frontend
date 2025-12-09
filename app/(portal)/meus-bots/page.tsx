// app/(portal)/meus-bots/page.tsx
"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api'; 
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch"; // <-- IMPORTANTE
import { Plus, Trash2, Bot as BotIcon, Store } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

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

interface Bot {
  id: number;
  restaurant_name: string;
  whatsapp_number: string;
  is_open: boolean; // <-- ADICIONADO
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function MeusBotsPage() {
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. Busca os Bots
  const { data: bots, isLoading, error } = useQuery<Bot[]>({
    queryKey: ['myBots'],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/bots`);
      return response.data;
    }
  });

  // 2. Mutação de Delete
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      return api.delete(`${API_BASE}/bots/${botId}`);
    },
    onSuccess: () => {
      toast({ title: "Bot excluído", description: "O bot e todos os seus dados foram removidos." });
      queryClient.invalidateQueries({ queryKey: ['myBots'] });
      setBotToDelete(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o bot.", variant: "destructive" });
      setBotToDelete(null);
    }
  });

  // 3. NOVA MUTAÇÃO: Abrir/Fechar Loja
  const toggleStoreMutation = useMutation({
    mutationFn: async ({ botId, isOpen }: { botId: number, isOpen: boolean }) => {
      // Chama a rota PUT existente
      return api.put(`${API_BASE}/bots/${botId}`, { is_open: isOpen });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myBots'] });
      const status = variables.isOpen ? "ABERTA 🟢" : "FECHADA 🔴";
      toast({ title: `Loja ${status}`, description: "O status do bot foi atualizado." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao atualizar status da loja.", variant: "destructive" });
    }
  });

  if (isLoading) return (
    <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    </div>
  );

  if (error) return <div className="p-8 text-red-500">Falha ao buscar bots: {error.message}</div>;

  return (
    <div>
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

      {/* Lista de Bots */}
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
            {bots?.map(bot => (
              <Link href={`/meus-bots/${bot.id}`} key={bot.id} className="block group">
                <Card className={`hover:shadow-md transition-all border-l-4 relative ${bot.is_open ? "border-l-green-500" : "border-l-red-300 bg-gray-50"}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            {bot.restaurant_name}
                            {!bot.is_open && <span className="text-xs font-normal text-red-500 border border-red-200 px-1.5 rounded">FECHADO</span>}
                        </CardTitle>
                        <p className="text-sm text-gray-500 font-mono">{bot.whatsapp_number}</p>
                      </div>
                      
                      {/* Botão de Delete */}
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
                  
                  <CardContent>
                    <div className="flex items-center justify-between mt-2">
                        
                        {/* Status Visual */}
                        <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${bot.is_open ? "text-green-600 bg-green-50" : "text-gray-500 bg-gray-200"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full mr-2 ${bot.is_open ? "bg-green-500" : "bg-gray-400"}`}></span>
                          {bot.is_open ? "Loja Aberta" : "Loja Fechada"}
                        </div>

                        {/* O INTERRUPTOR (SWITCH) */}
                        <div 
                            className="flex items-center gap-2" 
                            onClick={(e) => {
                                e.preventDefault(); // Impede navegação
                                e.stopPropagation(); // Impede navegação
                            }}
                        >
                            <Switch 
                                checked={bot.is_open}
                                onCheckedChange={(checked) => 
                                    toggleStoreMutation.mutate({ botId: bot.id, isOpen: checked })
                                }
                                disabled={toggleStoreMutation.isPending}
                            />
                        </div>

                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
      )}

      {/* Modal de Confirmação (Delete) */}
      <AlertDialog open={!!botToDelete} onOpenChange={(isOpen) => !isOpen && setBotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o bot 
              <strong className="px-1 text-foreground">{botToDelete?.restaurant_name}</strong>
              e todo o seu histórico de conversas, produtos e pedidos.
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