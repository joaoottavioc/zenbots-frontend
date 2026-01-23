"use client";

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query'; 
import { useRouter } from 'next/navigation'; 
import Link from "next/link"; 
import { api } from '@/lib/api'; 
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label';
import { Loader2, Command } from 'lucide-react'; // Ícones
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); 
  const { toast } = useToast();
  
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const loginMutation = useMutation({
    mutationFn: (formData: URLSearchParams) => {
      return api.post(`${API_BASE}/auth/token`, formData, { // <--- Adicione /auth
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
    },
    onSuccess: (response) => {
      const token = response.data.access_token;
      localStorage.setItem('zenbots_token', token);
      
      toast({
        title: "Login realizado!",
        description: "Redirecionando para o painel...",
        className: "bg-emerald-50 border-emerald-200"
      });

      router.push('/meus-bots');
    },
    onError: (error) => {
      console.error("Erro no login:", error);
      setError("Email ou senha incorretos.");
      toast({
        title: "Falha ao entrar",
        description: "Verifique suas credenciais.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    const formData = new URLSearchParams();
    formData.append('username', email); 
    formData.append('password', password);
    loginMutation.mutate(formData);
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      
      {/* --- COLUNA VISUAL (ESQUERDA) --- */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white dark:border-r">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                 <Label htmlFor="password">Senha</Label>
                 <Link href="/esqueci-senha" className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                    Esqueceu a senha?
                 </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-md text-center">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-10 font-medium"
              disabled={loginMutation.isPending} 
            >
              {loginMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {loginMutation.isPending ? "Validando..." : "Entrar na Conta"}
            </Button>
          </form>

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