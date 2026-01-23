"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  Loader2, 
  Camera,
  ShieldAlert,
  KeyRound,
  Mail,
  UserCircle,
  Save
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// --- Componente Visual de Requisitos de Senha (Estilo Clean) ---
const PasswordReq = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 ${met ? "text-emerald-600" : "text-muted-foreground/60"}`}>
    {met ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />}
    <span className={met ? "font-medium" : ""}>{text}</span>
  </div>
);

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  
  // Estado do Perfil
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Estado de Senha
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // --- BUSCA DADOS REAIS DO USUÁRIO ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const response = await api.get(`${API_BASE}/auth/me`);
        
        const userEmail = response.data.email;
        setEmail(userEmail);
        
        // Extrai nome do e-mail enquanto não temos coluna 'name' no banco
        if (userEmail) {
            const derivedName = userEmail.split('@')[0];
            setName(derivedName.charAt(0).toUpperCase() + derivedName.slice(1));
        }
        
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        toast({ 
            title: "Erro de conexão", 
            description: "Não foi possível carregar seus dados.", 
            variant: "destructive" 
        });
      }
    };

    fetchUserData();
  }, [toast]);

  // --- Validação em Tempo Real ---
  const hasMinLen = passwords.new.length >= 8;
  const hasUpper = /[A-Z]/.test(passwords.new);
  const hasLower = /[a-z]/.test(passwords.new);
  const hasNumber = /[0-9]/.test(passwords.new);
  const hasSpecial = /[^A-Za-z0-9]/.test(passwords.new);
  
  const isPasswordStrong = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;
  const doPasswordsMatch = passwords.new === passwords.confirm;

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.id]: e.target.value });
  };

  const handleSaveProfile = async () => {
    setIsLoadingProfile(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    toast({ 
      title: "Perfil salvo", 
      description: "Dados atualizados com sucesso.",
      className: "bg-emerald-50 border-emerald-200"
    });
    setIsLoadingProfile(false);
  };

  const handleUpdatePassword = async () => {
    if (!passwords.current) return toast({ title: "Erro", description: "Digite sua senha atual.", variant: "destructive" });
    if (!isPasswordStrong) return toast({ title: "Senha fraca", description: "Atenda aos requisitos de segurança.", variant: "destructive" });
    if (!doPasswordsMatch) return toast({ title: "Erro", description: "As senhas não conferem.", variant: "destructive" });

    setIsLoadingSecurity(true);
    try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        await api.post(`${API_BASE}/auth/change-password`, {
            current_password: passwords.current,
            new_password: passwords.new
        });

        toast({ 
            title: "Senha alterada!", 
            description: "Use a nova credencial no próximo login.",
            className: "bg-emerald-50 border-emerald-200 text-emerald-800"
        });
        setPasswords({ current: '', new: '', confirm: '' });

    } catch (error: any) {
        let msg = "Erro ao alterar senha.";
        if (error.response?.data?.detail) msg = error.response.data.detail;
        toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
        setIsLoadingSecurity(false);
    }
  };

  return (
    <div className="w-full p-6 animate-in fade-in duration-500">
      
      {/* Header Compacto */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie seu perfil e suas credenciais de acesso.
        </p>
      </div>

      <Separator className="mb-6" />

      {/* LAYOUT SIDEBAR + CONTEÚDO */}
      <Tabs defaultValue="profile" orientation="vertical" className="flex flex-col lg:flex-row w-full gap-8">
        
        {/* === SIDEBAR (Esquerda) === */}
        <aside className="w-full lg:w-60 shrink-0">
            <TabsList className="flex flex-col h-auto w-full items-stretch bg-transparent space-y-1 p-0">
                <TabsTrigger 
                    value="profile" 
                    className="justify-start px-3 py-2 text-sm font-medium transition-all 
                               data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 
                               rounded-md hover:bg-slate-50 text-muted-foreground"
                >
                    <UserCircle className="mr-2 h-4 w-4" />
                    Meu Perfil
                </TabsTrigger>
                <TabsTrigger 
                    value="security" 
                    className="justify-start px-3 py-2 text-sm font-medium transition-all 
                               data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 
                               rounded-md hover:bg-slate-50 text-muted-foreground"
                >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Segurança
                </TabsTrigger>
            </TabsList>
        </aside>

        {/* === CONTEÚDO (Direita - Full Width) === */}
        <div className="flex-1 w-full min-w-0">
            
            {/* >>> TAB: PERFIL <<< */}
            <TabsContent value="profile" className="m-0 border-none p-0 outline-none w-full">
                <Card className="w-full shadow-sm border-slate-200">
                    <CardHeader className="p-6 pb-4 border-b border-slate-100">
                        <CardTitle className="text-lg font-semibold">Informações Pessoais</CardTitle>
                        <CardDescription className="text-xs">Dados visíveis na plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        
                        <div className="flex items-center gap-5">
                            <div className="relative group cursor-pointer shrink-0">
                                <Avatar className="h-16 w-16 border-2 border-slate-100 shadow-sm">
                                    <AvatarImage src="" />
                                    <AvatarFallback className="text-lg bg-slate-50 text-slate-500 font-bold">
                                        {name ? name.substring(0, 2).toUpperCase() : "..."}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                                    <Camera className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-medium text-slate-900">Sua Foto</h3>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    Clique na imagem para alterar. JPG ou PNG.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm text-slate-700">Nome de Exibição</Label>
                                <Input 
                                    id="name" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-9 text-sm bg-white" 
                                    placeholder="Carregando..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm text-slate-700">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/70" />
                                    <Input 
                                        id="email" 
                                        value={email} 
                                        disabled 
                                        className="pl-9 h-9 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" 
                                        placeholder="Carregando..."
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                    <ShieldAlert className="h-3 w-3 text-amber-500" />
                                    Gerenciado pelo sistema.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button 
                                onClick={handleSaveProfile} 
                                disabled={isLoadingProfile || !email}
                                size="sm"
                                className="h-9 px-4 bg-slate-900 hover:bg-slate-800"
                            >
                                {isLoadingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* >>> TAB: SEGURANÇA <<< */}
            <TabsContent value="security" className="m-0 border-none p-0 outline-none w-full">
                <Card className="w-full shadow-sm border-slate-200">
                     <CardHeader className="p-6 pb-4 border-b border-slate-100">
                        <CardTitle className="text-lg font-semibold">Alterar Senha</CardTitle>
                        <CardDescription className="text-xs">Mantenha sua conta protegida.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        
                        {/* Senha Atual */}
                        <div className="space-y-2">
                            <Label htmlFor="current" className="text-sm text-slate-700">Senha Atual</Label>
                            <Input 
                                id="current" 
                                type="password" 
                                value={passwords.current}
                                onChange={handlePasswordChange}
                                className="w-full md:w-1/2 h-9 text-sm"
                                placeholder="Digite sua senha atual..." 
                            />
                        </div>

                        <Separator />

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="new" className="text-sm text-slate-700">Nova Senha</Label>
                                <Input 
                                    id="new" 
                                    type="password" 
                                    value={passwords.new}
                                    onChange={handlePasswordChange}
                                    className="h-9 text-sm"
                                    placeholder="No mínimo 8 caracteres"
                                />
                                
                                {/* ▼▼▼ CHECKLIST VISUAL (Estilo Clean) ▼▼▼ */}
                                {passwords.new && (
                                    <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-1 pl-1 animate-in fade-in slide-in-from-top-1">
                                        <PasswordReq met={hasMinLen} text="Min. 8 caracteres" />
                                        <PasswordReq met={hasUpper} text="Maiúscula" />
                                        <PasswordReq met={hasLower} text="Minúscula" />
                                        <PasswordReq met={hasNumber} text="Número" />
                                        <PasswordReq met={hasSpecial} text="Símbolo (!@#)" />
                                    </div>
                                )}
                                {/* ▲▲▲ FIM CHECKLIST ▲▲▲ */}

                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm" className="text-sm text-slate-700">Confirmar Senha</Label>
                                <Input 
                                    id="confirm" 
                                    type="password" 
                                    value={passwords.confirm}
                                    onChange={handlePasswordChange}
                                    className={`h-9 text-sm ${passwords.confirm && !doPasswordsMatch ? "border-red-300 focus-visible:ring-red-100" : ""}`}
                                    placeholder="Repita a nova senha"
                                />
                                {passwords.confirm && !doPasswordsMatch && (
                                    <p className="text-[11px] text-red-500 font-medium mt-1">As senhas não conferem.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button 
                                onClick={handleUpdatePassword} 
                                disabled={isLoadingSecurity || !isPasswordStrong || !passwords.current}
                                size="sm"
                                className="h-9 px-4 bg-slate-900 hover:bg-slate-800"
                            >
                                {isLoadingSecurity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Atualizar Senha
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}