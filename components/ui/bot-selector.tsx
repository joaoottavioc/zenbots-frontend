"use client";

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Store } from 'lucide-react'; // O ícone da "casinha/loja"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Bot {
  id: number;
  restaurant_name: string;
}

interface BotSelectorProps {
  selectedBotId: string | null;
  onBotChange: (botId: string) => void;
  className?: string;
}

export function BotSelector({ selectedBotId, onBotChange, className }: BotSelectorProps) {
  // 1. Busca os bots (cacheado pelo React Query)
  const { data: bots, isLoading } = useQuery<Bot[]>({
    queryKey: ['myBots'],
    queryFn: async () => (await api.get(`${API_BASE}/bots`)).data,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  // 2. Auto-seleciona o primeiro se nenhum estiver selecionado
  useEffect(() => {
    if (bots && bots.length > 0 && !selectedBotId) {
      onBotChange(String(bots[0].id));
    }
  }, [bots, selectedBotId, onBotChange]);

  if (isLoading) {
    return <Skeleton className="h-10 w-[240px]" />;
  }

  if (!bots || bots.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum bot encontrado</div>;
  }

  return (
    <div className={className}>
      <Select onValueChange={onBotChange} value={selectedBotId ?? undefined}>
        <SelectTrigger className="w-[240px] bg-background">
          {/* O ÍCONE PADRÃO AQUI: */}
          <Store className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Selecione a loja..." />
        </SelectTrigger>
        <SelectContent>
          {bots.map(bot => (
            <SelectItem key={bot.id} value={String(bot.id)}>
              {bot.restaurant_name || `Bot #${bot.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}