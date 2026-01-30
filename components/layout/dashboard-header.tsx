"use client";

import React from 'react';
import { BotSelector } from '@/components/ui/bot-selector';
import { Separator } from "@/components/ui/separator";

interface DashboardHeaderProps {
  title: React.ReactNode;
  description?: string;
  selectedBotId: string | null;
  onBotChange: (id: string) => void;
  titleSuffix?: React.ReactNode; // <--- NOVO: Para colocar o badge "Online" ao lado do título
  children?: React.ReactNode;    // Botões de ação
}

export function DashboardHeader({ 
  title, 
  description, 
  selectedBotId, 
  onBotChange, 
  titleSuffix,
  children 
}: DashboardHeaderProps) {
  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* LADO ESQUERDO: Título + Badge + Descrição */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {titleSuffix && (
                <div className="mt-1">{titleSuffix}</div>
            )}
          </div>
          {description && (
            <p className="text-slate-500 mt-1">{description}</p>
          )}
        </div>
        
        {/* LADO DIREITO: Botões <-- SEPARADOR --> Seletor (Ordem Invertida) */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full md:w-auto">
             
             {/* 1. Botões Específicos (Ficam à esquerda do seletor) */}
             {children && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {children}
                    {/* Divisória Vertical visual para separar botões do seletor */}
                    <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                </div>
             )}

             {/* 2. Seletor de Bot (Fica travado na direita) */}
             <BotSelector 
                selectedBotId={selectedBotId} 
                onBotChange={onBotChange} 
             />
        </div>
      </div>
      
      <Separator />
    </div>
  );
}