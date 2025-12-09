"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, X } from "lucide-react"; // Ícones para o feedback visual

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api"; 

// 1. Schema de Validação com Política Forte
const registerSchema = z.object({
  email: z.string().email({ message: "Digite um email válido." }),
  password: z
    .string()
    .min(8, { message: "Mínimo de 8 caracteres." })
    .regex(/[A-Z]/, { message: "Precisa ter uma letra maiúscula." })
    .regex(/[a-z]/, { message: "Precisa ter uma letra minúscula." })
    .regex(/[0-9]/, { message: "Precisa ter um número." })
    .regex(/[^A-Za-z0-9]/, { message: "Precisa ter um caractere especial (!@#$)." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange", // Valida enquanto digita para feedback rápido nos erros do form
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 2. Monitoramento em Tempo Real da Senha
  // Isso permite que a gente atualize a UI visual sem esperar o submit
  const passwordValue = form.watch("password");

  // Funções auxiliares para verificar cada regra visualmente
  const hasMinLen = passwordValue?.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordValue || "");
  const hasLower = /[a-z]/.test(passwordValue || "");
  const hasNumber = /[0-9]/.test(passwordValue || "");
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue || "");

  async function onSubmit(values: RegisterValues) {
    setIsLoading(true);
    try {
      await api.post(`${API_BASE}/register`, {
        email: values.email,
        password: values.password,
      });

      toast({
        title: "Conta criada com sucesso! 🎉",
        description: "Você será redirecionado para o login.",
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      let msg = "Erro ao criar conta. Tente novamente.";

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          msg = detail.map((err: any) => {
             const field = err.loc[err.loc.length - 1]; 
             return `${field}: ${err.msg}`;
          }).join(", ");
        } else if (typeof detail === "string") {
          msg = detail;
        }
      }
      
      toast({
        title: "Erro no cadastro",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Componente de Item da Lista de Senha
  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}>
      {met ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-red-400" />
      )}
      <span className={met ? "font-medium" : ""}>{text}</span>
    </div>
  );

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
        <CardDescription className="text-center">
          Comece a automatizar seu atendimento hoje.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Senha */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  
                  {/* ▼▼▼ CHECKLIST DE SENHA VISUAL ▼▼▼ */}
                  <div className="mt-3 space-y-1 rounded-md border p-3 bg-slate-50">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Sua senha deve ter:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <PasswordRequirement met={hasMinLen} text="8 caracteres" />
                        <PasswordRequirement met={hasUpper} text="Maiúscula (A-Z)" />
                        <PasswordRequirement met={hasLower} text="Minúscula (a-z)" />
                        <PasswordRequirement met={hasNumber} text="Número (0-9)" />
                        <PasswordRequirement met={hasSpecial} text="Símbolo (!@#)" />
                    </div>
                  </div>
                  {/* ▲▲▲ FIM DO CHECKLIST ▲▲▲ */}

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmar Senha */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Cadastrar"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-gray-600">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Fazer Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}