"use client";

import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Command } from 'lucide-react';
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

const loginSchema = z.object({
  email: z.string().email({ message: "Digite um email válido." }),
  password: z.string().min(1, { message: "Senha é obrigatória." }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const throttle = useSubmitThrottle();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (formData: URLSearchParams) => {
      return api.post('/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    },
    onSuccess: (response) => {
      throttle.reset();
      const token = response.data.access_token;
      setToken(token);

      toast({
        title: "Login realizado!",
        description: "Redirecionando para o painel...",
        className: "bg-emerald-50 border-emerald-200"
      });

      router.push('/meus-bots');
    },
    onError: () => {
      form.setError("root", { message: "Email ou senha incorretos." });
      toast({
        title: "Falha ao entrar",
        description: "Verifique suas credenciais.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: LoginValues) => {
    if (!throttle.recordSubmit()) return;
    const formData = new URLSearchParams();
    formData.append('username', values.email);
    formData.append('password', values.password);
    loginMutation.mutate(formData);
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">

      {/* --- COLUNA VISUAL (ESQUERDA) --- */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white">
        <div className="flex items-center text-lg font-medium gap-2">
          <div className="bg-white/10 p-1 rounded-md">
            <Command className="h-6 w-6" />
          </div>
          ZenBots AI
        </div>

        <div className="space-y-4">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Automatizar nosso atendimento com a ZenBots transformou nossa operação.
              Ganhamos 40 horas semanais e aumentamos as vendas em 30%.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">João Silva - CEO da Hamburgueria Top</footer>
          </blockquote>
        </div>
      </div>

      {/* --- COLUNA FORMULÁRIO (DIREITA) --- */}
      <div className="flex items-center justify-center py-12 px-8">
        <div className="mx-auto w-full max-w-[350px] space-y-6">

          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">
              Entre com seu email para acessar o painel
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <Link href="/esqueci-senha" className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-md text-center">
                  {form.formState.errors.root.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 font-medium"
                disabled={loginMutation.isPending || throttle.isThrottled}
              >
                {loginMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {throttle.isThrottled
                  ? `Aguarde ${throttle.remainingSeconds}s...`
                  : loginMutation.isPending
                    ? "Validando..."
                    : "Entrar na Conta"}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Novo por aqui?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/cadastro"
              className="text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Criar uma conta gratuitamente
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
