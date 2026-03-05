"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Command, Loader2, MessageSquare, ShoppingBag, BarChart3 } from "lucide-react";
import { PasswordReq } from "@/components/ui/password-req";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSubmitThrottle } from "@/hooks/use-submit-throttle";
import { api } from "@/lib/api";
import { getSafeErrorMessage } from "@/lib/error-messages";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Digite seu nome." }),
  whatsapp: z.string().optional().refine(
    (val) => !val || /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(val),
    { message: "Formato: (11) 99999-9999" }
  ),
  email: z.string().email({ message: "Digite um email valido." }),
  password: z
    .string()
    .min(8, { message: "Minimo de 8 caracteres." })
    .regex(/[A-Z]/, { message: "Letra maiuscula." })
    .regex(/[a-z]/, { message: "Letra minuscula." })
    .regex(/[0-9]/, { message: "Um numero." })
    .regex(/[^A-Za-z0-9]/, { message: "Caractere especial (!@#)." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas nao coincidem.",
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const throttle = useSubmitThrottle();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { name: "", whatsapp: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("password");

  const hasMinLen = passwordValue?.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordValue || "");
  const hasLower = /[a-z]/.test(passwordValue || "");
  const hasNumber = /[0-9]/.test(passwordValue || "");
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue || "");

  async function onSubmit(values: RegisterValues) {
    if (!throttle.recordSubmit()) return;
    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        name: values.name,
        email: values.email,
        password: values.password,
        ...(values.whatsapp ? { whatsapp: values.whatsapp } : {}),
      });

      throttle.reset();
      toast({
        title: "Conta criada!",
        description: "Verifique seu e-mail para ativar a conta.",
        className: "bg-emerald-50 border-emerald-200"
      });

      const emailParam = encodeURIComponent(values.email);
      router.push(`/verificar-email-enviado?email=${emailParam}`);

    } catch (error: unknown) {
      const msg = getSafeErrorMessage(error, "Falha ao criar conta.");
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">

      {/* Visual column */}
      <div className="hidden bg-slate-900 lg:flex flex-col justify-between p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex items-center text-lg font-medium gap-2 z-10">
          <div className="bg-white/10 p-1 rounded-md">
            <Command className="h-6 w-6" />
          </div>
          ZenBots AI
        </div>

        <div className="space-y-8 z-10 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Automatize seu delivery com inteligencia artificial.</h2>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 rounded-md bg-white/10 p-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium">Atendimento 24/7 via WhatsApp</p>
                <p className="text-sm text-slate-400">Seu bot responde clientes a qualquer hora, sem perder pedidos.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 rounded-md bg-white/10 p-2">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium">Pedidos automatizados</p>
                <p className="text-sm text-slate-400">Do cardapio ao pagamento, tudo num fluxo simples e rapido.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 rounded-md bg-white/10 p-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium">Analytics em tempo real</p>
                <p className="text-sm text-slate-400">Acompanhe vendas, produtos mais pedidos e metricas do negocio.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 z-10">Plataforma segura com criptografia de ponta a ponta.</p>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center py-12 px-8 bg-background">
        <div className="mx-auto w-full max-w-[440px] space-y-6">

          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados abaixo para comecar
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          className="h-10"
                          onChange={(e) => field.onChange(formatWhatsApp(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} className="h-10" />
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
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} className="h-10" />
                    </FormControl>

                    <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-1 pl-1">
                      <PasswordReq met={hasMinLen} text="Min. 8 caracteres" />
                      <PasswordReq met={hasUpper} text="Maiuscula" />
                      <PasswordReq met={hasLower} text="Minuscula" />
                      <PasswordReq met={hasNumber} text="Numero" />
                      <PasswordReq met={hasSpecial} text="Simbolo (!@#)" />
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
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-10 font-bold" disabled={isLoading || throttle.isThrottled}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {throttle.isThrottled
                  ? `Aguarde ${throttle.remainingSeconds}s...`
                  : isLoading
                    ? "Criando..."
                    : "Criar Conta Gratis"}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-muted-foreground">
            Ao criar sua conta, voce concorda com nossos{" "}
            <span className="underline underline-offset-4 cursor-pointer hover:text-primary">Termos de Uso</span>{" "}
            e{" "}
            <span className="underline underline-offset-4 cursor-pointer hover:text-primary">Politica de Privacidade</span>.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Ja possui cadastro?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 hover:underline underline-offset-4"
            >
              Fazer Login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
