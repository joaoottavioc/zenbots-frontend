"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Command, Lock, CheckCircle2, Check } from 'lucide-react'; // Adicionado Check
import { useToast } from "@/hooks/use-toast";

// Componente visual para os requisitos de senha (mesmo estilo do cadastro)
const PasswordReq = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-[11px] ${met ? "text-emerald-600" : "text-muted-foreground/60"}`}>
    {met ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />}
    <span className={met ? "font-medium" : ""}>{text}</span>
  </div>
);

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  // --- Validação Visual em Tempo Real ---
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  // O botão só habilita se tudo estiver válido E as senhas baterem
  const isFormValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial && (password === confirmPassword);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Token não encontrado.");
      if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
      if (!isFormValid) throw new Error("A senha não atende aos requisitos de segurança.");
      
      return api.post(`${API_BASE}/auth/reset-password`, {
        token: token,
        new_password: password
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
    onError: (error: any) => {
      let msg = "Erro ao redefinir senha.";
      if (error.response?.data?.detail) msg = error.response.data.detail;
      if (error.message) msg = error.message;
      
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMutation.mutate();
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
                  Sua conta está segura novamente.<br/>Redirecionando para o login...
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    id="password"
                    type="password"
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 h-10"
                />
              </div>

              {/* ▼▼▼ CHECKLIST DE SENHA (Igual ao Cadastro) ▼▼▼ */}
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-1 pl-1">
                  <PasswordReq met={hasMinLen} text="Min. 8 caracteres" />
                  <PasswordReq met={hasUpper} text="Maiúscula" />
                  <PasswordReq met={hasLower} text="Minúscula" />
                  <PasswordReq met={hasNumber} text="Número" />
                  <PasswordReq met={hasSpecial} text="Símbolo (!@#)" />
              </div>
              {/* ▲▲▲ FIM DO CHECKLIST ▲▲▲ */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    id="confirm"
                    type="password"
                    placeholder="******"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-9 h-10"
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 pl-1">As senhas não coincidem.</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 font-medium"
              disabled={resetMutation.isPending || !isFormValid} 
            >
              {resetMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {resetMutation.isPending ? "Salvando..." : "Alterar Senha"}
            </Button>
        </form>
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
            <Suspense fallback={<div className="text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div>}>
                <ResetForm />
            </Suspense>
        </div>
      </div>
    </div>
  );
}