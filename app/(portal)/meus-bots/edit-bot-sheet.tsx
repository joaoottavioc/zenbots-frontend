"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BotForm } from "../bots/novo/bot-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Fetch full bot details (list endpoint may omit cep, schedule, etc.)
  const { data: fullBot, isLoading: isLoadingBot } = useQuery<Bot>({
    queryKey: ["bot", bot?.id],
    queryFn: async () => {
      const res = await api.get(`/bots/${bot!.id}`);
      return res.data;
    },
    enabled: isOpen && !!bot,
  });

  const updateBotMutation = useMutation({
    mutationFn: async ({ values, image }: { values: BotFormValues; image?: File }) => {
      const res = await api.put(`/bots/${bot!.id}`, values);
      if (image) {
        const formData = new FormData();
        formData.append('file', image);
        await api.post(`/bots/${bot!.id}/image`, formData);
      }
      return res;
    },
    onSuccess: () => {
      toast({ title: "Bot atualizado!", description: "As configurações foram salvas." });
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      queryClient.invalidateQueries({ queryKey: ["bot", bot?.id] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const botData = fullBot ?? bot;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Bot</SheetTitle>
          <SheetDescription>
            Faça alterações no seu assistente {bot?.restaurant_name}.
          </SheetDescription>
        </SheetHeader>

        {bot && isLoadingBot ? (
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[150px] w-full rounded-lg" />
            <Skeleton className="h-[150px] w-full rounded-lg" />
          </div>
        ) : botData ? (
          <BotForm
            key={fullBot?.id}
            initialData={botData}
            onSubmit={(values, image) => updateBotMutation.mutate({ values, image })}
            isPending={updateBotMutation.isPending}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}