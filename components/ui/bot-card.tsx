"use client";

import React from "react";
import Image from "next/image"; 
import { 
  MessageCircle, 
  Settings, 
  MoreVertical, 
  Copy,
  ExternalLink,
  Trash2,
  Unplug 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import ConnectWhatsappButton from "@/components/ui/connect-whatsapp-button";
import { cn } from "@/lib/utils"; 

interface BotData {
  id: number;
  restaurant_name: string;
  whatsapp_number?: string;
  is_open: boolean;
  phone_number_id?: string;
}

interface BotCardProps {
  bot: BotData;
  onEdit: (bot: BotData) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  onDelete: (bot: BotData) => void;
  onDisconnect: (bot: BotData) => void;
}

export function BotCard({ bot, onEdit, onToggleStatus, onDelete, onDisconnect }: BotCardProps) {
  const { toast } = useToast();
  
  const isConnected = !!bot.phone_number_id && bot.phone_number_id.trim() !== "";
  const isOpen = bot.is_open;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copiado para a área de transferência!" });
  };

  return (
    <div className={cn(
      "group relative rounded-xl border shadow-sm transition-all duration-300 overflow-hidden flex flex-col",
      isOpen 
        ? "bg-white border-slate-200 hover:shadow-md hover:border-blue-200" 
        : "bg-slate-50/50 border-slate-200 hover:border-slate-300" // AGORA: Cinza suave quando fechado
    )}>
      
      {/* Barra lateral colorida */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300",
        isOpen ? "bg-emerald-500" : "bg-slate-400" // AGORA: Cinza quando fechado
      )} />

      <div className="p-4 flex-1">
        <div className="flex justify-between items-start mb-4 pl-2">
          
          <div className="flex items-center gap-4">
            {/* --- IMAGEM DO ROBÔ --- */}
            <div className={cn(
              "relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300",
              isOpen 
                ? "border-emerald-100 shadow-lg shadow-emerald-100/50" 
                : "border-slate-200 shadow-none grayscale" // AGORA: Cinza e sem sombra quando fechado
            )}>
               <Image 
                 src={isOpen ? "/bot-online.png" : "/bot-offline.png"} 
                 alt={isOpen ? "Bot Online" : "Bot Offline"}
                 fill
                 className="object-cover"
                 sizes="64px"
               />
            </div>
            
            <div>
              <h3 className={cn(
                "font-bold text-lg leading-tight transition-colors",
                isOpen ? "text-slate-900 group-hover:text-blue-600" : "text-slate-600" // AGORA: Texto cinza quando fechado
              )}>
                {bot.restaurant_name}
              </h3>
              
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wide",
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  <span className={cn(
                    "flex h-1.5 w-1.5 rounded-full",
                    isConnected ? "bg-emerald-500" : "bg-amber-400"
                  )} />
                  {isConnected ? "Conectado" : "Não Conectado"}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" aria-label="Menu de ações">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(bot)}>
                <Settings className="mr-2 h-4 w-4" /> Configurações
              </DropdownMenuItem>
              {bot.whatsapp_number && (
                <DropdownMenuItem onClick={() => copyToClipboard(bot.whatsapp_number!)}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar Número
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {isConnected && (
                  <DropdownMenuItem onClick={() => onDisconnect(bot)} className="text-amber-600 focus:text-amber-700 cursor-pointer">
                    <Unplug className="mr-2 h-4 w-4" /> Desconectar
                  </DropdownMenuItem>
              )}

              <DropdownMenuItem 
                onClick={() => onDelete(bot)} 
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Deletar Bot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* INFO */}
        <div className="pl-2 space-y-3 mt-2">
          {bot.whatsapp_number && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/50 p-2 rounded-lg border border-slate-100/50">
              <MessageCircle className="h-4 w-4 text-slate-400" />
              <span className="font-mono">{bot.whatsapp_number}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Loja</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider transition-colors",
                  isOpen ? "text-emerald-600" : "text-slate-500"
                )}>
                    {isOpen ? "Aberta" : "Fechada"}
                </span>
                <Switch
                    checked={isOpen}
                    onCheckedChange={(val) => onToggleStatus(bot.id, val)}
                    aria-label="Alterar status da loja"
                    className={cn(
                      "scale-75 transition-all",
                      "data-[state=checked]:bg-emerald-500",
                      "data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-400" // Switch cinza quando fechado
                    )}
                />
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "border-t p-3 flex gap-2 transition-colors",
        isOpen ? "bg-slate-50 border-slate-100" : "bg-slate-100/50 border-slate-200" // AGORA: Footer cinza claro quando fechado
      )}>
        {isConnected ? (
           <Button 
             variant="outline" 
             className="flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 shadow-sm"
             onClick={() => onEdit(bot)}
           >
             <Settings className="mr-2 h-3.5 w-3.5" /> Gerenciar
           </Button>
        ) : (
           <div className="flex-1">
             <ConnectWhatsappButton botId={bot.id} />
           </div>
        )}
        
        {bot.whatsapp_number && (
          <Button
              variant="brand"
              className="flex-1 text-xs h-9"
              onClick={() => window.open(`https://wa.me/${bot.whatsapp_number}`, '_blank')}
          >
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Testar
          </Button>
        )}
      </div>
    </div>
  );
}