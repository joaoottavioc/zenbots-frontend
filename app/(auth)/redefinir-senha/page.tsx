"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Command, Lock, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PasswordReq } from "@/components/ui/password-req";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Mínimo de 8 caracteres." })
    .regex(/[A-Z]/, { message: "Letra maiúscula." })
    .regex(/[a-z]/, { message: "Letra minúscula." })
    .regex(/[0-9]/, { message: "Um número." })
    .regex(/[^A-Za-z0-9]/, { message: "Caractere especial (!@#)." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type ResetValues = z.infer<typeof resetSchema>;

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("password");

  // --- Validação Visual em Tempo Real ---
  const hasMinLen = (passwordValue?.length ?? 0) >= 8;
  const hasUpper = /[A-Z]/.test(passwordValue || "");
  const hasLower = /[a-z]/.test(passwordValue || "");
  const hasNumber = /[0-9]/.test(passwordValue || "");
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue || "");

  const resetMutation = useMutation({
    mutationFn: async (values: ResetValues) => {
      if (!token) throw new Error("Token não encontrado.");

      return api.post('/auth/reset-password', {
        token: token,
        new_password: values.password
      });
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada! 🎉",
        description: "Você já pode fazer login com a nova senha.",
        className: "bg-emerald-50 border-emerald-200"
      });
      setTimeout(() => router.push("/login"), 2000);
    },
    onError: (error: unknown) => {
      let msg = "Erro ao redefinir senha.";
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      if (err.response?.data?.detail) msg = err.response.data.detail;
      else if (err.message) msg = err.message;

      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  });

  const onSubmit = (values: ResetValues) => {
    resetMutation.mutate(values);
  };

  if (!token) {
    return (
      <div className="text-center text-red-500 bg-red-50 p-4 rounded-md border border-red-100">
        Link inválido ou expirado. Por favor, solicite uma nova recuperação.
      </div>
    );
  }

  if (resetMutation.isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-emerald-700">Senha Atualizada!</h2>
        <p className="text-muted-foreground text-center">
          Sua conta está segura novamente.<br />Redirecionando para o login...
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Nova Senha</h1>
        <p className="text-sm text-muted-foreground">
          Crie uma senha forte para proteger sua conta.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="******"
                      {...field}
                      className="pl-9 h-10"
                    />
                  </div>
                </FormControl>

                <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-1 pl-1">
                  <PasswordReq met={hasMinLen} text="Min. 8 caracteres" />
                  <PasswordReq met={hasUpper} text="Maiúscula" />
                  <PasswordReq met={hasLower} text="Minúscula" />
                  <PasswordReq met={hasNumber} text="Número" />
                  <PasswordReq met={hasSpecial} text="Símbolo (!@#)" />
                </div>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Nova Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="******"
                      {...field}
                      className="pl-9 h-10"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-10 font-medium"
            disabled={resetMutation.isPending || !form.formState.isValid}
          >
            {resetMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {resetMutation.isPending ? "Salvando..." : "Alterar Senha"}
          </Button>
        </form>
      </Form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      {/* --- COLUNA VISUAL (ESQUERDA) --- */}
      <div className="hidden bg-zinc-950 lg:flex flex-col justify-between p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
        <div className="flex items-center text-lg font-medium gap-2 z-10">
          <div className="bg-white/10 p-1 rounded-md">
            <Command className="h-6 w-6" />
          </div>
          ZenBots AI
        </div>
        <div className="space-y-4 z-10">
          <h2 className="text-3xl font-bold tracking-tight">Segurança em primeiro lugar.</h2>
          <p className="text-zinc-400">Sua conta está segura conosco. Defina sua nova senha e volte a faturar.</p>
        </div>
      </div>

      {/* --- COLUNA FORMULÁRIO (DIREITA) --- */}
      <div className="flex items-center justify-center py-12 px-8">
        <div className="mx-auto w-full max-w-[350px] space-y-6">
          <Suspense fallback={<div className="text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
