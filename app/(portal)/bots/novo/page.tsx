// app/(portal)/bots/novo/page.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BotForm } from './bot-form'; // Importa o formulário que criamos
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function NewBotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Mutação para enviar dados ao Backend
  const createBotMutation = useMutation({
    mutationFn: async (values: any) => {
      // Limpa o telefone (remove tudo que não for número) para evitar erro no backend
      const cleanNumber = values.whatsapp_number.replace(/\D/g, '');
      
      return api.post(`${API_BASE}/bots`, {
        ...values,
        whatsapp_number: cleanNumber
      });
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Bot criado. Agora você pode adicionar produtos." });
      
      // Atualiza a lista de "Meus Bots" para o novo aparecer lá
      queryClient.invalidateQueries({ queryKey: ['myBots'] });
      
      // Redireciona de volta para a lista
      router.push('/meus-bots');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || "Erro ao criar bot.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  });

  return (
    <div className="max-w-2xl mx-auto">
      
      {/* Botão de Voltar */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
          <Link href="/meus-bots" className="flex items-center text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Meus Bots
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Bot</CardTitle>
          <CardDescription>
            Configure o básico do seu novo atendente virtual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Renderiza o Formulário */}
          <BotForm 
            onSubmit={(values) => createBotMutation.mutate(values)}
            isPending={createBotMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}