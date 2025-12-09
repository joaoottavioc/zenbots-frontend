"use client"; 

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query'; 
import { useRouter } from 'next/navigation'; 
import Link from "next/link"; // <--- Importe o Link
import { api } from '@/lib/api'; 
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input'; 
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card'; // Adicionei CardDescription
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); 
  
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const loginMutation = useMutation({
    mutationFn: (formData: URLSearchParams) => {
      return api.post(`${API_BASE}/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    },
    onSuccess: (response) => {
      const token = response.data.access_token;
      localStorage.setItem('zenbots_token', token);
      router.push('/meus-bots');
    },
    onError: (error) => {
      console.error("Erro no login:", error);
      setError("Email ou senha inválidos.");
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
    // Removemos a div centralizadora daqui porque o layout.tsx já faz isso!
    <Card className="w-[350px] shadow-lg"> 
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Entre para gerenciar seus bots
            </CardDescription>
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
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending} 
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>

            {/* Link para Cadastro */}
            <p className="text-sm text-gray-600 text-center">
              Ainda não tem conta?{" "}
              <Link href="/cadastro" className="text-blue-600 hover:underline font-medium">
                Criar Conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
  );
}