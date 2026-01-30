"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  Loader2, 
  KeyRound,
  UserCircle,
  Save,
  CreditCard, 
  Zap, 
  Store
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// --- Tipos ---
interface Bot {
    id: number;
    restaurant_name: string;
    whatsapp_number: string;
}

interface SubscriptionStatus {
  status: string;         
  is_active: boolean;     
  days_remaining: number;    
  next_payment: string;   
  plan_type?: string; // <--- CORREÇÃO: Agora usamos plan_type (igual ao backend)
}

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // 1. Busca Dados do Usuário
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        const userEmail = response.data.email;
        setEmail(userEmail);
        if (userEmail) {
            const derivedName = userEmail.split('@')[0];
            setName(derivedName.charAt(0).toUpperCase() + derivedName.slice(1));
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      }
    };
    fetchUserData();
  }, []);

  // 2. Busca Lista de Bots
  useEffect(() => {
    const fetchBots = async () => {
        try {
            const res = await api.get('/api/v1/bots'); 
            setBots(res.data);
            if (res.data.length > 0 && !selectedBotId) {
                setSelectedBotId(res.data[0].id.toString());
            }
        } catch (error) {
            console.error("Erro ao buscar bots:", error);
        }
    };
    fetchBots();
  }, [selectedBotId]);

  // 3. Busca Status da Assinatura
  useEffect(() => {
    if (!selectedBotId) return;
    const fetchBillingInfo = async () => {
        setLoadingBilling(true);
        try {
            const res = await api.get(`/billing/status?bot_id=${selectedBotId}`);
            setSubStatus(res.data);
        } catch (error) {
            console.error("Erro ao carregar assinatura:", error);
            setSubStatus(null);
        } finally {
            setLoadingBilling(false);
        }
    };
    fetchBillingInfo();
  }, [selectedBotId]);

  // --- Ação de Checkout ---
  // --- Ação de Checkout (Nova Aba) ---
  const handleSubscribe = async (planKey: string) => {
    if (!selectedBotId) {
        toast({ title: "Selecione um Bot", description: "Crie um bot antes de assinar.", variant: "destructive" });
        return;
    }
    
    setProcessingPlan(planKey); // 1. Ativa o spinner no botão

    try {
        const response = await api.post('/billing/checkout', { 
            plan_key: planKey,
            bot_id: parseInt(selectedBotId)
        });

        if (response.data.checkout_url) {
            // 2. MUDANÇA AQUI: window.open com '_blank' abre em nova aba
            window.open(response.data.checkout_url, '_blank');
        }
    } catch (error) {
        toast({ title: "Erro no pagamento", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
        // 3. IMPORTANTE: Como a página atual não vai fechar, precisamos parar o spinner manualmente
        setProcessingPlan(null);
    }
  };

  // --- Helpers e Handlers ---
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
    toast({ title: "Perfil salvo", className: "bg-emerald-50 border-emerald-200" });
    setIsLoadingProfile(false);
  };

  const handleUpdatePassword = async () => {
    if (!passwords.current) return toast({ title: "Erro", description: "Digite sua senha atual.", variant: "destructive" });
    if (!isPasswordStrong) return toast({ title: "Senha fraca", description: "Atenda aos requisitos.", variant: "destructive" });
    if (!doPasswordsMatch) return toast({ title: "Erro", description: "Senhas não conferem.", variant: "destructive" });

    setIsLoadingSecurity(true);
    try {
        await api.post('/auth/change-password', {
            current_password: passwords.current,
            new_password: passwords.new
        });
        toast({ title: "Senha alterada!", className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
        setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
        let msg = "Erro ao alterar senha.";
        if (error.response?.data?.detail) msg = error.response.data.detail;
        toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
        setIsLoadingSecurity(false);
    }
  };

  // ➤ LÓGICA CORRIGIDA: Verifica plan_type em vez de plan_key
  const isCurrentPlan = (targetPlan: string) => {
    if (!subStatus?.is_active) return false;
    // O backend envia 'basic' ou 'pro' no campo plan_type
    return subStatus.plan_type === targetPlan;
  };

  return (
    <div className="w-full p-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie seu perfil e suas credenciais de acesso.</p>
      </div>
      <Separator className="mb-6" />

      <Tabs defaultValue="profile" orientation="vertical" className="flex flex-col lg:flex-row w-full gap-8">
        <aside className="w-full lg:w-60 shrink-0">
            <TabsList className="flex flex-col h-auto w-full items-stretch bg-transparent space-y-1 p-0">
                <TabsTrigger value="profile" className="justify-start px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md hover:bg-slate-50 text-muted-foreground"><UserCircle className="mr-2 h-4 w-4" /> Meu Perfil</TabsTrigger>
                <TabsTrigger value="security" className="justify-start px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md hover:bg-slate-50 text-muted-foreground"><KeyRound className="mr-2 h-4 w-4" /> Segurança</TabsTrigger>
                <TabsTrigger value="subscription" className="justify-start px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md hover:bg-slate-50 text-muted-foreground"><CreditCard className="mr-2 h-4 w-4" /> Assinatura</TabsTrigger>
            </TabsList>
        </aside>

        <div className="flex-1 w-full min-w-0">
            {/* PERFIL e SEGURANÇA omitidos para brevidade, mantenha o código anterior nestas abas */}
            <TabsContent value="profile" className="m-0 border-none p-0 outline-none w-full">
                <Card className="w-full shadow-sm border-slate-200">
                    <CardHeader className="p-6 pb-4 border-b border-slate-100"><CardTitle className="text-lg font-semibold">Informações Pessoais</CardTitle><CardDescription className="text-xs">Dados visíveis na plataforma.</CardDescription></CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center gap-5"><Avatar className="h-16 w-16 border-2 border-slate-100 shadow-sm"><AvatarImage src="" /><AvatarFallback className="text-lg bg-slate-50 text-slate-500 font-bold">{name ? name.substring(0, 2).toUpperCase() : "..."}</AvatarFallback></Avatar><div className="space-y-1"><h3 className="text-sm font-medium text-slate-900">Sua Foto</h3><p className="text-xs text-muted-foreground max-w-sm">Clique na imagem para alterar.</p></div></div>
                        <div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Nome</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={email} disabled className="h-9 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" /></div></div>
                        <div className="flex justify-end pt-2"><Button onClick={handleSaveProfile} disabled={isLoadingProfile || !email} size="sm" className="h-9 px-4 bg-slate-900 hover:bg-slate-800">{isLoadingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar</Button></div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="m-0 border-none p-0 outline-none w-full">
                <Card className="w-full shadow-sm border-slate-200">
                     <CardHeader className="p-6 pb-4 border-b border-slate-100"><CardTitle className="text-lg font-semibold">Alterar Senha</CardTitle><CardDescription className="text-xs">Mantenha sua conta protegida.</CardDescription></CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2"><Label htmlFor="current">Senha Atual</Label><Input id="current" type="password" value={passwords.current} onChange={handlePasswordChange} className="w-full md:w-1/2 h-9 text-sm" /></div><Separator />
                        <div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="new">Nova Senha</Label><Input id="new" type="password" value={passwords.new} onChange={handlePasswordChange} className="h-9 text-sm" />{passwords.new && (<div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-1 pl-1 animate-in fade-in slide-in-from-top-1"><PasswordReq met={hasMinLen} text="Min. 8 caracteres" /><PasswordReq met={hasUpper} text="Maiúscula" /><PasswordReq met={hasLower} text="Minúscula" /><PasswordReq met={hasNumber} text="Número" /><PasswordReq met={hasSpecial} text="Símbolo (!@#)" /></div>)}</div><div className="space-y-2"><Label htmlFor="confirm">Confirmar Senha</Label><Input id="confirm" type="password" value={passwords.confirm} onChange={handlePasswordChange} className={`h-9 text-sm ${passwords.confirm && !doPasswordsMatch ? "border-red-300 focus-visible:ring-red-100" : ""}`} /></div></div>
                        <div className="flex justify-end pt-2"><Button onClick={handleUpdatePassword} disabled={isLoadingSecurity || !isPasswordStrong || !passwords.current} size="sm" className="h-9 px-4 bg-slate-900 hover:bg-slate-800">{isLoadingSecurity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Atualizar Senha</Button></div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="subscription" className="m-0 border-none p-0 outline-none w-full animate-in fade-in duration-500">
                
                {/* 1. SELEÇÃO DE BOT */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Store className="w-4 h-4 text-slate-500"/> Gerenciar Assinatura de:</h2>
                        <p className="text-xs text-muted-foreground">Selecione qual loja você deseja configurar.</p>
                    </div>
                    <div className="w-full md:w-64">
                         {bots.length > 0 ? (
                            <Select value={selectedBotId} onValueChange={(val) => setSelectedBotId(val)}>
                                <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Selecione um Bot" /></SelectTrigger>
                                <SelectContent>{bots.map((bot) => (<SelectItem key={bot.id} value={bot.id.toString()}>{bot.restaurant_name || `Bot #${bot.id}`}</SelectItem>))}</SelectContent>
                            </Select>
                         ) : (<div className="text-sm text-amber-600 font-medium">Você ainda não tem Bots.</div>)}
                    </div>
                </div>

                {loadingBilling ? (
                    <div className="flex items-center justify-center h-40 border rounded-lg border-dashed"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : (
                    <>
                    {/* 2. Status do Bot Selecionado */}
                    {selectedBotId && (
                        <Card className="w-full shadow-sm border-slate-200 mb-6 bg-slate-50/50">
                            <CardHeader className="p-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            Status 
                                            {subStatus?.is_active ? (
                                                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                                                    Ativo - {subStatus.plan_type === 'pro' ? 'PRO' : 'Básico'}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Inativo / Gratuito</Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">{subStatus?.is_active ? `Próxima renovação em ${new Date(subStatus.next_payment).toLocaleDateString()}` : "Assine para desbloquear recursos premium."}</CardDescription>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center"><Zap className={`h-5 w-5 ${subStatus?.is_active ? 'text-emerald-500' : 'text-amber-500'}`} /></div>
                                </div>
                            </CardHeader>
                        </Card>
                    )}

                    {/* 3. Lista de Planos */}
                    {selectedBotId && (
                        <>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Planos Disponíveis</h3>
                        <div className="grid md:grid-cols-2 gap-6 pb-10">
                            
                            {/* === PLANO BÁSICO === */}
                            <Card className={`flex flex-col border-2 transition-all relative ${isCurrentPlan('basic') ? 'border-emerald-500 bg-emerald-50/10' : 'hover:border-slate-300 border-slate-100'}`}>
                                {isCurrentPlan('basic') && (<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wide shadow-sm">Plano Atual</div>)}
                                <CardHeader><CardTitle className="text-xl">ZenBotZ Básico</CardTitle><CardDescription>Para iniciar sua operação.</CardDescription></CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div className="text-3xl font-bold">R$ 5,00<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                                    <ul className="space-y-2 text-sm text-slate-600"><li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500"/> Bot de Atendimento 24h</li><li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500"/> Cardápio Digital Simples</li></ul>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={() => handleSubscribe('basic')} disabled={!!processingPlan || isCurrentPlan('basic')} variant="outline" className="w-full">
                                        {isCurrentPlan('basic') ? "Plano Atual" : processingPlan === 'basic' ? <Loader2 className="animate-spin h-4 w-4"/> : "Assinar Básico"}
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* === PLANO PRO === */}
                            <Card className={`flex flex-col border-2 transition-all relative ${isCurrentPlan('pro') ? 'border-sky-500 bg-sky-50/10' : 'border-sky-100 shadow-sm hover:shadow-md'}`}>
                                {isCurrentPlan('pro') ? (<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wide shadow-sm">Plano Atual</div>) : (<div className="absolute top-0 right-0 bg-sky-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide">Recomendado</div>)}
                                <CardHeader><CardTitle className="text-xl text-sky-700">ZenBotZ Pro</CardTitle><CardDescription>Pizzaria Dominadora</CardDescription></CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div className="text-3xl font-bold">R$ 10,00<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                                    <ul className="space-y-2 text-sm text-slate-600"><li className="flex gap-2"><Check className="h-4 w-4 text-sky-500"/> <strong>Tudo do Básico</strong></li><li className="flex gap-2"><Check className="h-4 w-4 text-sky-500"/> Leitura de Cardápio por Foto (IA)</li><li className="flex gap-2"><Check className="h-4 w-4 text-sky-500"/> Relatório de Mais Vendidos</li></ul>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={() => handleSubscribe('pro')} disabled={!!processingPlan || isCurrentPlan('pro')} className={`w-full ${isCurrentPlan('pro') ? 'bg-sky-100 text-sky-700 hover:bg-sky-200 border-none' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>
                                        {isCurrentPlan('pro') ? "Plano Atual" : processingPlan === 'pro' ? <Loader2 className="animate-spin h-4 w-4"/> : "Assinar Pro"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                        </>
                    )}
                    </>
                )}
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}