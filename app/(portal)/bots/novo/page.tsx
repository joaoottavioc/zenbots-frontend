"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BotForm } from './bot-form'; 
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/error-messages";
import type { BotFormValues } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewBotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBotMutation = useMutation({
    mutationFn: async (values: BotFormValues) => {
      return api.post('/bots', values);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Bot criado! Conecte o WhatsApp na página Meus Bots." });
      queryClient.invalidateQueries({ queryKey: ['myBots'] });
      router.push('/meus-bots');
    },
    onError: (error: unknown) => {
      toast({ title: "Erro", description: getSafeErrorMessage(error, "Erro ao criar bot."), variant: "destructive" });
    }
  });

  return (
    // LIMPEZA: Removemos hacks de altura/largura. 
    // O 'max-w-4xl' centraliza o formulário e 'mx-auto' alinha no meio.
    <PageContainer className="max-w-4xl">
      
      {/* Botão de Voltar */}
      <div className="mb-6 flex items-center">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
          <Link href="/meus-bots" className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Meus Bots
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-2xl font-heading font-bold text-slate-900">
            Criar Novo Bot
          </CardTitle>
          <CardDescription>
            Configure o básico do seu novo atendente virtual.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <BotForm 
            onSubmit={(values) => createBotMutation.mutate(values)}
            isPending={createBotMutation.isPending}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}