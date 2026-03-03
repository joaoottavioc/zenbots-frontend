"use client";

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Command, ArrowLeft, MailCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSubmitThrottle } from "@/hooks/use-submit-throttle";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const forgotSchema = z.object({
  email: z.string().email({ message: "Digite um email válido." }),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const throttle = useSubmitThrottle();

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const forgotMutation = useMutation({
    mutationFn: async (email: string) => {
      return api.post('/auth/forgot-password', { email });
    },
    onSuccess: () => {
      throttle.reset();
      setIsSubmitted(true);
      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada.",
        className: "bg-emerald-50 border-emerald-200"
      });
    },
    onError: () => {
      // Always show success view to prevent email enumeration
      setIsSubmitted(true);
    }
  });

  const onSubmit = (values: ForgotValues) => {
    if (!throttle.recordSubmit()) return;
    forgotMutation.mutate(values.email);
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">

      {/* --- COLUNA VISUAL (ESQUERDA) --- */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex items-center text-lg font-medium gap-2 z-10">
          <div className="bg-white/10 p-1 rounded-md">
            <Command className="h-6 w-6" />
          </div>
          ZenBots AI
        </div>

        <div className="space-y-4 z-10">
          <h2 className="text-3xl font-bold tracking-tight">Recuperação segura e rápida.</h2>
          <p className="text-zinc-400">Não se preocupe, acontece com os melhores. Vamos te ajudar a voltar para seus bots.</p>
        </div>
      </div>

      {/* --- COLUNA FORMULÁRIO (DIREITA) --- */}
      <div className="flex items-center justify-center py-12 px-8">
        <div className="mx-auto w-full max-w-[350px] space-y-6">

          {/* Botão Voltar */}
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Login
          </Link>

          {!isSubmitted ? (
            <>
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Esqueceu a senha?</h1>
                <p className="text-sm text-muted-foreground">
                  Digite seu email e enviaremos um link para redefinir suas credenciais.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email cadastrado</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="nome@exemplo.com"
                            {...field}
                            className="h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-10 font-medium"
                    disabled={forgotMutation.isPending || throttle.isThrottled}
                  >
                    {forgotMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {throttle.isThrottled
                      ? `Aguarde ${throttle.remainingSeconds}s...`
                      : forgotMutation.isPending
                        ? "Enviando..."
                        : "Enviar Link de Recuperação"}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <MailCheck className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Verifique seu e-mail</h2>
              <p className="text-muted-foreground">
                Enviamos um link de recuperação para <strong>{form.getValues('email')}</strong>.
              </p>
              <div className="pt-4 w-full">
                <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
                  Tentar outro e-mail
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-muted-foreground pt-4">
                  Dica de Dev: Verifique o
                  <a href="http://localhost:8025" target="_blank" className="text-primary hover:underline ml-1 font-bold">
                    MailHog (localhost:8025)
                  </a>.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
