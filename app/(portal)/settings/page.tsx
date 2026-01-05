"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CreditCard, Shield, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function ConfiguracoesPage() {
  const { toast } = useToast();

  const handleSave = () => {
    // Aqui você conectaria com o backend para salvar
    toast({ title: "Configurações salvas!", description: "Seus dados foram atualizados com sucesso." });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account" className="flex gap-2"><User className="w-4 h-4"/> Minha Conta</TabsTrigger>
          <TabsTrigger value="billing" className="flex gap-2"><CreditCard className="w-4 h-4"/> Assinatura</TabsTrigger>
          <TabsTrigger value="security" className="flex gap-2"><Shield className="w-4 h-4"/> Segurança</TabsTrigger>
        </TabsList>

        {/* ABA: CONTA */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Atualize seus dados pessoais de identificação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" defaultValue="João Rosário" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue="joao@exemplo.com" disabled className="bg-gray-100" />
                <p className="text-[10px] text-gray-500">O email não pode ser alterado manualmente.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ABA: ASSINATURA */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Gerencie sua assinatura e faturas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Plano PRO</h4>
                    <p className="text-sm text-slate-500">R$ 197,00 / mês</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">ATIVO</span>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>Próxima cobrança: <strong>15 de Fevereiro de 2026</strong></p>
                <p>Método: Cartão final 4242</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline">Ver Faturas</Button>
                <Button variant="destructive">Cancelar Assinatura</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ABA: SEGURANÇA */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Mantenha sua conta segura alterando sua senha periodicamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="current">Senha Atual</Label>
                <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input id="current" type="password" className="pl-9" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new">Nova Senha</Label>
                <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input id="new" type="password" className="pl-9" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} variant="secondary">Atualizar Senha</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}