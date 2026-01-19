"use client";

import React from "react";
import { 
  Bot, 
  MessageCircle, 
  Settings, 
  Store, 
  MoreVertical, 
  Power, 
  Copy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import ConnectWhatsappButton from "@/components/ui/connect-whatsapp-button"; // Seu botão existente

interface BotData {
  id: number;
  restaurant_name: string;
  whatsapp_number: string;
  is_open: boolean;
  phone_number_id?: string; // Para saber se está conectado
}

interface BotCardProps {
  bot: BotData;
  onEdit: (bot: BotData) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
}

export function BotCard({ bot, onEdit, onToggleStatus }: BotCardProps) {
  const { toast } = useToast();
  
  const isConnected = !!bot.phone_number_id;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copiado para a área de transferência!" });
  };

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden flex flex-col">
      
      {/* --- STATUS STRIP (Barra lateral colorida) --- */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${bot.is_open ? "bg-emerald-500" : "bg-slate-300"}`} />

      <div className="p-5 flex-1">
        {/* HEADER: Ícone e Menu */}
        <div className="flex justify-between items-start mb-4 pl-2">
          
          {/* Ícone "Bonitinho" do Bot */}
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${
                bot.is_open ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>
              <Bot className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                {bot.restaurant_name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`flex h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-amber-400"}`} />
                <span className="text-xs text-slate-500 font-medium">
                  {isConnected ? "WhatsApp Conectado" : "Aguardando Conexão"}
                </span>
              </div>
            </div>
          </div>

          {/* Menu de Ações (Dropdown) */}
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
              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                Deletar Bot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* INFO: Telefone e ID */}
        <div className="pl-2 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <MessageCircle className="h-4 w-4 text-slate-400" />
            <span className="font-mono">{bot.whatsapp_number || "Sem número"}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Loja</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${bot.is_open ? "text-emerald-600" : "text-slate-500"}`}>
                    {bot.is_open ? "Aberta" : "Fechada"}
                </span>
                <Switch 
                    checked={bot.is_open} 
                    onCheckedChange={(val) => onToggleStatus(bot.id, val)}
                    className="scale-75 data-[state=checked]:bg-emerald-500"
                />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Ações Principais */}
      <div className="bg-slate-50 border-t border-slate-100 p-3 flex gap-2">
        {isConnected ? (
           <Button 
             variant="outline" 
             className="flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
             onClick={() => onEdit(bot)}
           >
             <Settings className="mr-2 h-3.5 w-3.5" /> Gerenciar
           </Button>
        ) : (
           // Aqui importamos seu botão existente, mas estilizado para caber no card
           <div className="flex-1">
             <ConnectWhatsappButton />
           </div>
        )}
        
        <Button 
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-xs h-9"
            onClick={() => window.open(`https://wa.me/${bot.whatsapp_number}`, '_blank')}
        >
            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Testar
        </Button>
      </div>
    </div>
  );
}