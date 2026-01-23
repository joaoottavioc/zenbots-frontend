"use client";

import React from "react";
import { 
  Bot, 
  MessageCircle, 
  Settings, 
  MoreVertical, 
  Copy,
  ExternalLink,
  Trash2,
  Unplug // Ícone para desconectar
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
  whatsapp_number: string;
  is_open: boolean;
  phone_number_id?: string;
}

interface BotCardProps {
  bot: BotData;
  onEdit: (bot: BotData) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  onDelete: (bot: BotData) => void;
  onDisconnect: (bot: BotData) => void; // <--- NOVA PROP
}

export function BotCard({ bot, onEdit, onToggleStatus, onDelete, onDisconnect }: BotCardProps) {
  const { toast } = useToast();
  
  // Verificação de segurança: só consideramos conectado se tiver ID E não for string vazia
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
        : "bg-rose-50/30 border-rose-100 hover:border-rose-200"
    )}>
      
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300",
        isOpen ? "bg-emerald-500" : "bg-rose-500"
      )} />

      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4 pl-2">
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 text-white",
              isOpen 
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200" 
                : "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-200"
            )}>
              <Bot className="h-6 w-6" strokeWidth={1.5} />
            </div>
            
            <div>
              <h3 className={cn(
                "font-bold text-lg leading-tight transition-colors",
                isOpen ? "text-slate-900 group-hover:text-blue-600" : "text-slate-700 group-hover:text-rose-600"
              )}>
                {bot.restaurant_name}
              </h3>
              
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn(
                  "flex h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-amber-400"
                )} />
                <span className="text-xs text-slate-500 font-medium">
                  {isConnected ? "WhatsApp Conectado" : "Não Conectado"}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(bot)}>
                <Settings className="mr-2 h-4 w-4" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyToClipboard(bot.whatsapp_number)}>
                <Copy className="mr-2 h-4 w-4" /> Copiar Número
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Opção DESCONECTAR (Aparece se estiver conectado) */}
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
        <div className="pl-2 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/50 p-2 rounded-lg border border-slate-100/50">
            <MessageCircle className="h-4 w-4 text-slate-400" />
            <span className="font-mono">{bot.whatsapp_number || "Sem número"}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Loja</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider transition-colors",
                  isOpen ? "text-emerald-600" : "text-rose-600"
                )}>
                    {isOpen ? "Aberta" : "Fechada"}
                </span>
                <Switch 
                    checked={isOpen} 
                    onCheckedChange={(val) => onToggleStatus(bot.id, val)}
                    className={cn(
                      "scale-75 transition-all",
                      "data-[state=checked]:bg-emerald-500",
                      "data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700"
                    )}
                />
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "border-t p-3 flex gap-2 transition-colors",
        isOpen ? "bg-slate-50 border-slate-100" : "bg-rose-50/50 border-rose-100"
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
        
        <Button 
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 shadow-sm transition-all"
            onClick={() => window.open(`https://wa.me/${bot.whatsapp_number}`, '_blank')}
        >
            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Testar
        </Button>
      </div>
    </div>
  );
}