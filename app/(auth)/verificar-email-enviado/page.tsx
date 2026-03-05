"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Command, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getSafeErrorMessage } from "@/lib/error-messages";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const rawEmail = searchParams.get("email") || "";
  const email = EMAIL_REGEX.test(rawEmail) ? rawEmail : "";
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      toast({
        title: "E-mail reenviado",
        description: "Verifique sua caixa de entrada.",
        className: "bg-emerald-50 border-emerald-200",
      });
      setCooldown(60);
    } catch (error: unknown) {
      const msg = getSafeErrorMessage(error, "Falha ao reenviar. Tente novamente.");
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsResending(false);
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
        <div className="space-y-4 z-10 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Falta pouco para comecar!</h2>
          <p className="text-slate-400">Confirme seu e-mail e comece a automatizar seu delivery em minutos.</p>
        </div>
        <p className="text-xs text-slate-500 z-10">Plataforma segura com criptografia de ponta a ponta.</p>
      </div>

      {/* Content column */}
      <div className="flex items-center justify-center py-12 px-8 bg-background">
        <div className="mx-auto w-full max-w-[400px] space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <Mail className="h-8 w-8 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Verifique seu e-mail</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de verificacao para{" "}
              {email ? <strong className="text-foreground">{email}</strong> : "seu e-mail"}.
              Clique no link para ativar sua conta.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Nao recebeu? Verifique a pasta de spam ou clique abaixo.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || cooldown > 0 || !email}
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cooldown > 0
                ? `Reenviar em ${cooldown}s`
                : isResending
                  ? "Reenviando..."
                  : "Reenviar e-mail"}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            E-mail errado?{" "}
            <Link
              href="/cadastro"
              className="font-medium text-primary hover:text-primary/80 hover:underline underline-offset-4"
            >
              Cadastre-se novamente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}
