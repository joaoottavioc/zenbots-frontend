"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MessageSquare, ShoppingBag, BarChart3 } from "lucide-react";
import { PasswordReq } from "@/components/ui/password-req";
import { NightSkyline } from "@/components/ui/smash-burger-animation";

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
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">

      {/* Visual column */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white relative overflow-hidden">
        {/* Night skyline — covers the entire left section */}
        <NightSkyline />

        {/* Top branding — matches login */}
        <div className="flex items-center text-lg font-medium gap-2 z-10">
          <span className="font-logo text-xl tracking-tight">
            <span className="text-zinc-300">Zen</span>
            <span className="text-white font-bold">Bot</span>
            <span className="text-cyan-400">Z</span>
          </span>
          <span className="text-xs text-zinc-500 ml-1">AI Delivery</span>
        </div>

        {/* Feature highlights — floating over the skyline */}
        <div className="flex-1 flex items-center z-10">
          <div className="space-y-8 max-w-md">
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Automatize seu delivery com
              <span className="text-cyan-400"> inteligencia artificial.</span>
            </h2>
            <div className="space-y-5">
              <div className="flex items-start gap-3 group">
                <div className="flex-shrink-0 mt-0.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20 p-2 transition-colors group-hover:bg-cyan-400/15">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium">Atendimento 24/7 via WhatsApp</p>
                  <p className="text-sm text-zinc-400">Seu bot responde clientes a qualquer hora, sem perder pedidos.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 group">
                <div className="flex-shrink-0 mt-0.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20 p-2 transition-colors group-hover:bg-cyan-400/15">
                  <ShoppingBag className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium">Pedidos automatizados</p>
                  <p className="text-sm text-zinc-400">Do cardapio ao pagamento, tudo num fluxo simples e rapido.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 group">
                <div className="flex-shrink-0 mt-0.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20 p-2 transition-colors group-hover:bg-cyan-400/15">
                  <BarChart3 className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium">Analytics em tempo real</p>
                  <p className="text-sm text-zinc-400">Acompanhe vendas, produtos mais pedidos e metricas do negocio.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — matches login testimonial area */}
        <div className="z-10">
          <p className="text-xs text-zinc-500">Plataforma segura com criptografia de ponta a ponta.</p>
        </div>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center py-6 px-8 bg-background overflow-y-auto">
        <div className="mx-auto w-full max-w-[440px] space-y-4">

          <div className="flex flex-col space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados abaixo para comecar
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} className="h-9" />
                      </FormControl>
                      <div className="min-h-[16px]"><FormMessage /></div>
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
                          className="h-9"
                          onChange={(e) => field.onChange(formatWhatsApp(e.target.value))}
                        />
                      </FormControl>
                      <div className="min-h-[16px]"><FormMessage /></div>
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
                      <Input placeholder="seu@email.com" {...field} className="h-9" />
                    </FormControl>
                    <div className="min-h-[16px]"><FormMessage /></div>
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
                      <Input type="password" placeholder="********" {...field} className="h-9" />
                    </FormControl>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 pl-0.5">
                      <PasswordReq met={hasMinLen} text="Min. 8 caracteres" />
                      <PasswordReq met={hasUpper} text="Maiuscula" />
                      <PasswordReq met={hasLower} text="Minuscula" />
                      <PasswordReq met={hasNumber} text="Numero" />
                      <PasswordReq met={hasSpecial} text="Simbolo (!@#)" />
                    </div>

                    <div className="min-h-[16px]"><FormMessage /></div>
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
                      <Input type="password" placeholder="********" {...field} className="h-9" />
                    </FormControl>
                    <div className="min-h-[16px]"><FormMessage /></div>
                  </FormItem>
                )}
              />

              <div className="pt-1 space-y-3">
                <Button type="submit" className="w-full h-10 font-bold" disabled={isLoading || throttle.isThrottled}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {throttle.isThrottled
                    ? `Aguarde ${throttle.remainingSeconds}s...`
                    : isLoading
                      ? "Criando..."
                      : "Criar Conta Gratis"}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground leading-tight">
                  Ao criar sua conta, voce concorda com nossos{" "}
                  <span className="underline underline-offset-4 cursor-pointer hover:text-primary">Termos de Uso</span>{" "}
                  e{" "}
                  <span className="underline underline-offset-4 cursor-pointer hover:text-primary">Politica de Privacidade</span>.
                </p>
              </div>
            </form>
          </Form>

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
