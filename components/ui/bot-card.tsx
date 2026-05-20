"use client";

import React from "react";
import Image from "next/image";
import {
  MessageCircle,
  Settings,
  MoreVertical,
  Copy,
  ExternalLink,
  Globe,
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
import { WhatsAppIcon } from "@/app/(portal)/pedidos/whatsapp-icon";
import { cn } from "@/lib/utils";
import { isWhatsappSignupEnabled } from "@/lib/feature-flags";

interface BotData {
  id: number;
  restaurant_name: string;
  whatsapp_number?: string;
  is_open?: boolean;
  phone_number_id?: string;
  restaurant_image_url?: string | null;
  // Web widget fields (plan/in_browser_bots.md §4). Optional so the
  // BotCard stays usable from tests/storybook with minimal fixture data.
  web_widget_enabled?: boolean;
  slug?: string;
}

interface BotCardProps {
  bot: BotData;
  onEdit: (bot: BotData) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  onDelete: (bot: BotData) => void;
  onDisconnect: (bot: BotData) => void;
  /** Optional — when provided, the dropdown menu shows
   *  "Atendimento Web". Tests/storybook can omit this to keep the
   *  card surface narrow. */
  onConfigureWebWidget?: (bot: BotData) => void;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Brazilian: 55 + 2-digit DDD + 9-digit mobile (or 8-digit landline)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    const formatted = number.length === 9
      ? `${number.slice(0, 5)}-${number.slice(5)}`
      : `${number.slice(0, 4)}-${number.slice(4)}`;
    return `+55 (${ddd}) ${formatted}`;
  }
  return raw;
}

export function BotCard({
  bot,
  onEdit,
  onToggleStatus,
  onDelete,
  onDisconnect,
  onConfigureWebWidget,
}: BotCardProps) {
  const { toast } = useToast();
  
  const isConnected = !!bot.phone_number_id && bot.phone_number_id.trim() !== "";
  const isOpen = bot.is_open ?? false;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copiado para a área de transferência!" });
  };

  const hasImage = !!bot.restaurant_image_url;

  return (
    <div className={cn(
      "group relative rounded-xl border shadow-sm transition-all duration-300 overflow-hidden flex flex-col",
      hasImage
        ? "border-white/10 hover:shadow-lg"
        : isOpen
          ? "bg-white border-slate-200 hover:shadow-md hover:border-blue-200"
          : "bg-slate-50/50 border-slate-200 hover:border-slate-300",
      !isOpen && hasImage && "grayscale"
    )}>

      {/* Full background restaurant image */}
      {hasImage && (
        <>
          <Image
            src={bot.restaurant_image_url!}
            alt={`Foto de ${bot.restaurant_name}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          {/* Gradient overlay — stronger at top/bottom where text lives, transparent in center to show image */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/50" />
        </>
      )}

      {/* Barra lateral colorida */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300 z-10",
        isOpen ? "bg-emerald-500" : hasImage ? "bg-slate-500" : "bg-slate-400"
      )} />

      <div className="relative z-10 p-4 flex-1">
        <div className="flex justify-between items-start mb-4 pl-2">

          <div className="flex items-center gap-4">
            {/* Bot avatar */}
            <div className={cn(
              "relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300",
              isOpen
                ? hasImage
                  ? "border-white/30 shadow-lg shadow-black/20"
                  : "border-emerald-100 shadow-lg shadow-emerald-100/50"
                : hasImage
                  ? "border-white/10 shadow-none"
                  : "border-slate-200 shadow-none grayscale"
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
                hasImage
                  ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] group-hover:text-cyan-200"
                  : isOpen
                    ? "text-slate-900 group-hover:text-blue-600"
                    : "text-slate-600"
              )}>
                {bot.restaurant_name}
              </h3>

              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {/* Channel chips — web widget status is primary; WhatsApp
                    becomes secondary while signup is deferred. */}
                <ChannelChip
                  active={!!bot.web_widget_enabled}
                  hasImage={hasImage}
                  label={bot.web_widget_enabled ? "Web Ativo" : "Web Inativo"}
                  icon={<Globe className="h-3 w-3" />}
                />
                {isWhatsappSignupEnabled() ? (
                  <ChannelChip
                    active={isConnected}
                    hasImage={hasImage}
                    label={isConnected ? "WhatsApp Conectado" : "WhatsApp Não Conectado"}
                    icon={<WhatsAppIcon className="h-3 w-3" />}
                  />
                ) : (
                  <ChannelChip
                    active={false}
                    hasImage={hasImage}
                    label="WhatsApp em breve"
                    icon={<WhatsAppIcon className="h-3 w-3" />}
                    muted
                  />
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  hasImage
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-slate-400 hover:text-slate-700"
                )}
                aria-label="Menu de ações"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(bot)}>
                <Settings className="mr-2 h-4 w-4" /> Configurações
              </DropdownMenuItem>
              {onConfigureWebWidget && (
                <DropdownMenuItem onClick={() => onConfigureWebWidget(bot)}>
                  <Globe className="mr-2 h-4 w-4" /> Atendimento Web
                  {bot.web_widget_enabled && (
                    <span className="ml-auto inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </DropdownMenuItem>
              )}
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
            <div className={cn(
              "flex items-center gap-2 text-sm p-2 rounded-lg border",
              hasImage
                ? "text-white bg-black/30 backdrop-blur-sm border-white/10"
                : "text-slate-600 bg-white/50 border-slate-100/50"
            )}>
              <MessageCircle className={cn("h-4 w-4", hasImage ? "text-white/70" : "text-slate-400")} />
              <span className="font-mono">{formatPhone(bot.whatsapp_number!)}</span>
            </div>
          )}

          <div className={cn(
            "flex items-center justify-between pt-1 px-2 py-1.5 rounded-lg",
            hasImage && "bg-black/30 backdrop-blur-sm"
          )}>
            <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  hasImage ? "text-white/70" : "text-slate-400"
                )}>Status Loja</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider transition-colors",
                  isOpen
                    ? hasImage ? "text-emerald-400" : "text-emerald-600"
                    : hasImage ? "text-white/70" : "text-slate-500"
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
                      "data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-400"
                    )}
                />
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "relative z-10 border-t p-3 flex gap-2 transition-colors",
        hasImage
          ? "bg-black/30 border-white/10 backdrop-blur-sm"
          : isOpen
            ? "bg-slate-50 border-slate-100"
            : "bg-slate-100/50 border-slate-200"
      )}>
        {isConnected ? (
           <Button
             variant="outline"
             className={cn(
               "flex-1 text-xs h-9 shadow-sm",
               hasImage
                 ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                 : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
             )}
             onClick={() => onEdit(bot)}
           >
             <Settings className="mr-2 h-3.5 w-3.5" /> Gerenciar
           </Button>
        ) : (
           <div className="flex-1">
             <ConnectWhatsappButton botId={bot.id} />
           </div>
        )}

        {bot.whatsapp_number && isWhatsappSignupEnabled() && (
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

interface ChannelChipProps {
  active: boolean;
  hasImage: boolean;
  label: string;
  icon: React.ReactNode;
  /** When true, render in a neutral gray regardless of `active` — used
   *  for the "WhatsApp em breve" state where activity is intentionally
   *  ambiguous (no real connection possible right now). */
  muted?: boolean;
}

function ChannelChip({ active, hasImage, label, icon, muted = false }: ChannelChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wide",
        muted
          ? hasImage
            ? "bg-slate-500/20 text-slate-200 border-slate-400/30 backdrop-blur-sm"
            : "bg-slate-100 text-slate-600 border-slate-200"
          : active
            ? hasImage
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30 backdrop-blur-sm"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
            : hasImage
              ? "bg-amber-500/20 text-amber-300 border-amber-400/30 backdrop-blur-sm"
              : "bg-amber-50 text-amber-700 border-amber-200",
      )}
    >
      {icon}
      {label}
    </span>
  );
}