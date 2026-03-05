"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getSafeErrorMessage } from "@/lib/error-messages";

type VerifyState = "loading" | "success" | "already-verified" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = searchParams.get("token");
  const calledRef = useRef(false);

  const [state, setState] = useState<VerifyState>("loading");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setState("error");
      return;
    }

    // Remove token from URL to prevent leakage via Referer/history
    window.history.replaceState({}, "", "/verificar-email");

    api.post("/auth/verify-email", { token })
      .then((res) => {
        const msg: string = res.data?.message || "";
        if (msg.includes("ja verificado") || msg.includes("já verificado")) {
          setState("already-verified");
        } else {
          setState("success");
        }
        setTimeout(() => router.push("/login?verified=true"), 3000);
      })
      .catch(() => {
        setState("error");
      });
  }, [token, router]);

  async function handleResend() {
    if (!resendEmail || resendCooldown > 0) return;
    setIsResending(true);
    try {
      await api.post("/auth/resend-verification", { email: resendEmail });
      toast({
        title: "Link enviado",
        description: "Verifique sua caixa de entrada.",
        className: "bg-emerald-50 border-emerald-200",
      });
      setResendCooldown(60);
    } catch (error: unknown) {
      const msg = getSafeErrorMessage(error, "Falha ao enviar. Tente novamente.");
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
          <h2 className="text-3xl font-bold tracking-tight">Verificacao de e-mail</h2>
          <p className="text-slate-400">Estamos confirmando sua identidade para manter sua conta segura.</p>
        </div>
        <p className="text-xs text-slate-500 z-10">Plataforma segura com criptografia de ponta a ponta.</p>
      </div>

      {/* Content column */}
      <div className="flex items-center justify-center py-12 px-8 bg-background">
        <div className="mx-auto w-full max-w-[400px] space-y-6 text-center">

          {state === "loading" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Verificando seu e-mail...</h1>
                <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
              </div>
            </>
          )}

          {(state === "success" || state === "already-verified") && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {state === "success" ? "E-mail verificado!" : "E-mail ja verificado"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Redirecionando para o login...
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Ir para o login agora
              </Link>
            </>
          )}

          {state === "error" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Link invalido ou expirado</h1>
                <p className="text-sm text-muted-foreground">
                  O link de verificacao pode ter expirado ou ja foi utilizado. Solicite um novo abaixo.
                </p>
              </div>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="h-10"
                />
                <Button
                  className="w-full"
                  onClick={handleResend}
                  disabled={isResending || !resendEmail || resendCooldown > 0}
                >
                  {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {resendCooldown > 0
                    ? `Reenviar em ${resendCooldown}s`
                    : isResending
                      ? "Enviando..."
                      : "Solicitar novo link"}
                </Button>
              </div>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline underline-offset-4"
              >
                Voltar para o login
              </Link>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
