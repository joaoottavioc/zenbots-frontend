"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, X, Command, Loader2 } from "lucide-react";
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

// Schema mantido (Política Forte)
const registerSchema = z.object({
  email: z.string().email({ message: "Digite um email válido." }),
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

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const throttle = useSubmitThrottle();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("password");

  // Validadores visuais
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
        email: values.email,
        password: values.password,
      });

      throttle.reset();
      toast({
        title: "Conta criada! 🎉",
        description: "Redirecionando para o login...",
        className: "bg-emerald-50 border-emerald-200"
      });

      setTimeout(() => router.push("/login"), 1500);

    } catch (error: unknown) {
      const msg = getSafeErrorMessage(error, "Falha ao criar conta.");
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      
      {/* --- COLUNA VISUAL (ESQUERDA) - Invertida para variar ou manter padrão --- */}
      <div className="hidden bg-slate-900 lg:flex flex-col justify-between p-10 text-white relative overflow-hidden">
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex items-center text-lg font-medium gap-2 z-10">
          <div className="bg-white/10 p-1 rounded-md">
            <Command className="h-6 w-6" />
          </div>
          ZenBots AI
        </div>
        
        <div className="space-y-4 z-10 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Comece a vender mais com Inteligência Artificial.</h2>
          <p className="text-slate-400">Junte-se a centenas de restaurantes que automatizaram seus pedidos e delivery.</p>
        </div>
      </div>

      {/* --- COLUNA FORMULÁRIO (DIREITA) --- */}
      <div className="flex items-center justify-center py-12 px-8 bg-background">
        <div className="mx-auto w-full max-w-[400px] space-y-6">
          
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Criar uma conta</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados abaixo para começar
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
                      <Input type="password" placeholder="******" {...field} className="h-10" />
                    </FormControl>
                    
                    {/* Checklist Compacto e Elegante */}
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
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} className="h-10" />
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
                    : "Cadastrar Gratuitamente"}
              </Button>
            </form>
          </Form>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Já possui cadastro?{" "}
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