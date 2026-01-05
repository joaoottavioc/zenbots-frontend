"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';

// Importe o componente reutilizável
import { BotSelector } from '@/components/ui/bot-selector';

// Importe os cards do Dashboard
import { BestSellersCard } from '../analytics/best-sellers-card';

export default function DashboardPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-10">
      
      {/* --- HEADER PADRONIZADO --- */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        
        {/* Lado Esquerdo: Título */}
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-primary" /> 
          Visão Geral
        </h1>

        {/* Lado Direito: Seletor de Bot */}
        <div className="flex items-center gap-2">
            <BotSelector 
                selectedBotId={selectedBotId} 
                onBotChange={setSelectedBotId} 
            />
        </div>
      </div>

      <hr />

      {/* --- ÁREA DE CONTEÚDO --- */}
      {selectedBotId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Card de Produtos Mais Vendidos */}
            <div className="col-span-1 h-full">
                <BestSellersCard botId={selectedBotId} />
            </div>

            {/* Placeholder para futuros gráficos */}
            <Card className="col-span-1 md:col-span-2 bg-muted/20 border-dashed flex items-center justify-center min-h-[300px]">
                <CardContent className="text-muted-foreground text-center p-6">
                    <p>Em breve: Gráfico de Faturamento Mensal</p>
                </CardContent>
            </Card>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
             {/* Hack para garantir que o BotSelector carregue os bots e selecione o primeiro automaticamente mesmo se a UI estiver vazia */}
             <BotSelector selectedBotId={selectedBotId} onBotChange={setSelectedBotId} className="opacity-0 h-0 w-0 overflow-hidden" />
             <p>Selecione uma loja para visualizar os dados.</p>
        </div>
      )}
    </div>
  );
}