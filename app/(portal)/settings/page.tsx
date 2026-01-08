"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CreditCard, Shield, Lock, Eye, EyeOff, Mail } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function ConfiguracoesPage() {
  const { toast } = useToast();

  // Estados para controlar a visibilidade das senhas
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  // Estado para o formulário de senha
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.id]: e.target.value });
  };

  const handleSaveProfile = () => {
    // Lógica de salvar perfil (Nome)
    toast({ 
      title: "Perfil atualizado!", 
      description: "Suas informações básicas foram salvas." 
    });
  };

  const handleUpdatePassword = () => {
    if (passwords.new !== passwords.confirm) {
      toast({ 
        title: "Erro na validação", 
        description: "A nova senha e a confirmação não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (passwords.new.length < 6) {
      toast({ 
        title: "Senha muito curta", 
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    // Aqui você chamaria o backend
    toast({ 
      title: "Senha alterada!", 
      description: "Sua senha foi atualizada com sucesso.",
      className: "bg-green-600 text-white"
    });
    
    // Limpar campos
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie seus dados pessoais e de acesso.</p>
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
              <CardDescription>Estes dados identificam você como administrador na plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Nome */}
              <div className="space-y-1">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input id="name" defaultValue="João Rosário" className="pl-9" />
                </div>
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-1">
                <Label htmlFor="email">Email de Acesso</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input 
                    id="email" 
                    defaultValue="joao@exemplo.com" 
                    disabled 
                    className="pl-9 bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" 
                  />
                </div>
                <p className="text-[11px] text-gray-500 pt-1">
                  Este email é seu identificador único. Para alterá-lo, entre em contato com o suporte.
                </p>
              </div>

            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile}>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ABA: ASSINATURA (Mantida igual, apenas placeholder visual) */}
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

        {/* ABA: SEGURANÇA (Melhorada) */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Recomendamos usar uma senha forte com caracteres especiais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Senha Atual */}
              <div className="space-y-1">
                <Label htmlFor="current">Senha Atual</Label>
                <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                      id="current" 
                      type={showCurrentPass ? "text" : "password"} 
                      className="pl-9 pr-10" 
                      value={passwords.current}
                      onChange={handlePasswordChange}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
              </div>

              <div className="border-t my-2 border-gray-100"></div>

              {/* Nova Senha */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="new">Nova Senha</Label>
                  <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        id="new" 
                        type={showNewPass ? "text" : "password"} 
                        className="pl-9 pr-10" 
                        value={passwords.new}
                        onChange={handlePasswordChange}
                      />
                       <button 
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div className="space-y-1">
                  <Label htmlFor="confirm">Confirmar Nova Senha</Label>
                  <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        id="confirm" 
                        type={showNewPass ? "text" : "password"} 
                        className={`pl-9 ${passwords.confirm && passwords.new !== passwords.confirm ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        value={passwords.confirm}
                        onChange={handlePasswordChange}
                      />
                  </div>
                  {passwords.confirm && passwords.new !== passwords.confirm && (
                    <p className="text-[10px] text-red-500 font-medium absolute">As senhas não coincidem</p>
                  )}
                </div>
              </div>

            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleUpdatePassword} 
                variant="secondary"
                disabled={!passwords.current || !passwords.new || !passwords.confirm}
              >
                Atualizar Senha
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}