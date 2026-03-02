"use client";

import React, { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BotForm } from "../bots/novo/bot-form"; // Importando seu formulário existente
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { Bot, BotFormValues } from "@/lib/types";

interface EditBotSheetProps {
  bot: Bot | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditBotSheet({ bot, isOpen, onClose }: EditBotSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Mutação de Atualização (PUT)
  const updateBotMutation = useMutation({
    mutationFn: async (values: BotFormValues) => {
      // Limpeza básica igual na criação
      const cleanNumber = values.whatsapp_number.replace(/\D/g, "");
      
      // Chama a rota PUT /bots/{id}
      return api.put(`/bots/${bot!.id}`, {
        ...values,
        whatsapp_number: cleanNumber,
      });
    },
    onSuccess: () => {
      toast({ title: "Bot atualizado!", description: "As configurações foram salvas." });
      queryClient.invalidateQueries({ queryKey: ["myBots"] }); // Atualiza a lista no fundo
      onClose(); // Fecha a gaveta
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Bot</SheetTitle>
          <SheetDescription>
            Faça alterações no seu assistente {bot?.restaurant_name}.
          </SheetDescription>
        </SheetHeader>

        {/* Renderizamos o BotForm apenas se houver um bot selecionado.
            Passamos os dados atuais como 'initialData'.
        */}
        {bot && (
          <BotForm
            initialData={bot}
            onSubmit={(values) => updateBotMutation.mutate(values)}
            isPending={updateBotMutation.isPending}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}