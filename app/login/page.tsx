// app/login/page.tsx
"use client"; // Obrigatório para usar hooks do React (useState, etc.)

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query'; // Para lidar com o "submit"
import { useRouter } from 'next/navigation'; // Para redirecionar após o login
import { api } from '@/lib/api'; // Nosso cliente Axios do Passo 4
import { Button } from '@/components/ui/button'; // Componente Shadcn
import { Input } from '@/components/ui/input'; // Componente Shadcn
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'; // Componente Shadcn
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Hook para navegar
  
  
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  // 1. Configuração do React Query para a "mutação" (o login)
  const loginMutation = useMutation({
    mutationFn: (formData: URLSearchParams) => {
      // 2. Chama a rota /token do FastAPI
      // NOTA: O OAuth2PasswordRequestForm do FastAPI espera dados de formulário, não JSON.
      return api.post(`${API_BASE}/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    },
    onSuccess: (response) => {
      // 3. SUCESSO: Salva o token no "bolso" do navegador
      const token = response.data.access_token;
      localStorage.setItem('zenbots_token', token);
      
      // 4. Redireciona para o dashboard
      router.push('/meus-bots');
    },
    onError: (error) => {
      // 5. FALHA: Mostra uma mensagem de erro
      console.error("Erro no login:", error);
      setError("Email ou senha inválidos.");
    }
  });

  // 6. Função chamada quando o formulário é enviado
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Limpa erros antigos

    // 7. Prepara os dados no formato de formulário que o FastAPI espera
    const formData = new URLSearchParams();
    formData.append('username', email); // O FastAPI espera 'username'
    formData.append('password', password);

    // 8. Executa a mutação
    loginMutation.mutate(formData);
  };

  // 9. O formulário visual (JSX)
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[350px]">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Login - ZenBots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="lojista@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending} // Desativa o botão enquanto carrega
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}