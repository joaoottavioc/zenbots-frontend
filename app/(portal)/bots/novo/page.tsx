"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BotForm } from './bot-form'; 
import { useToast } from "@/hooks/use-toast";
import type { BotFormValues } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewBotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBotMutation = useMutation({
    mutationFn: async (values: BotFormValues) => {
      const cleanNumber = values.whatsapp_number.replace(/\D/g, '');
      return api.post('/bots', {
        ...values,
        whatsapp_number: cleanNumber
      });
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Bot criado. Agora você pode adicionar produtos." });
      queryClient.invalidateQueries({ queryKey: ['myBots'] });
      router.push('/meus-bots');
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao criar bot.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  });

  return (
    // LIMPEZA: Removemos hacks de altura/largura. 
    // O 'max-w-4xl' centraliza o formulário e 'mx-auto' alinha no meio.
    <div className="max-w-4xl mx-auto">
      
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
    </div>
  );
}