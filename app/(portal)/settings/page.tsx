"use client";

import React, { useState, useMemo } from 'react';
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from '@/lib/api';
import { isTrustedRedirectUrl } from '@/lib/url-validation';
import { getSafeErrorMessage } from '@/lib/error-messages';
import { useQuery } from '@tanstack/react-query';
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
import { PasswordReq } from "@/components/ui/password-req";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import type { Plan } from '@/lib/types';

// --- Tipos ---
interface Bot {
    id: number;
    restaurant_name: string;
}

interface SubscriptionStatus {
  status: string;
  is_active: boolean;
  days_remaining: number;
  next_payment: string;
  plan_type?: string;
}

const PLAN_FEATURES: Record<string, string[]> = {
  basic: ['Bot de Atendimento 24h', 'Cardápio Digital Simples'],
  pro: ['Tudo do Básico', 'Leitura de Cardápio por Foto (IA)', 'Relatório de Mais Vendidos'],
};

const PLAN_STYLES: Record<string, { border: string; activeBorder: string; activeBg: string; badgeBg: string; badgeText: string; badgeBorder: string; checkColor: string; buttonClass: string; activeButtonClass: string; titleColor: string; recommended: boolean }> = {
  basic: {
    border: 'hover:border-slate-300 border-slate-100',
    activeBorder: 'border-emerald-500 bg-emerald-50/10',
    activeBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    checkColor: 'text-emerald-500',
    buttonClass: '',
    activeButtonClass: '',
    titleColor: '',
    recommended: false,
  },
  pro: {
    border: 'border-sky-100 shadow-sm hover:shadow-md',
    activeBorder: 'border-sky-500 bg-sky-50/10',
    activeBg: 'bg-sky-500',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    checkColor: 'text-sky-500',
    buttonClass: 'bg-sky-500 hover:bg-sky-600 text-white',
    activeButtonClass: 'bg-sky-100 text-sky-700 hover:bg-sky-200 border-none',
    titleColor: 'text-sky-700',
    recommended: true,
  },
};

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(price);

const changePasswordSchema = z.object({
  current: z.string().min(1, { message: "Senha atual é obrigatória." }),
  new: z
    .string()
    .min(8, { message: "Mínimo de 8 caracteres." })
    .regex(/[A-Z]/, { message: "Letra maiúscula." })
    .regex(/[a-z]/, { message: "Letra minúscula." })
    .regex(/[0-9]/, { message: "Um número." })
    .regex(/[^A-Za-z0-9]/, { message: "Caractere especial (!@#)." }),
  confirm: z.string(),
}).refine((data) => data.new === data.confirm, {
  message: "As senhas não coincidem.",
  path: ["confirm"],
});

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const botIdFromUrl = searchParams.get("bot_id");
  const defaultTab = tabFromUrl === "subscription" || tabFromUrl === "security" ? tabFromUrl : "profile";

  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string>(botIdFromUrl || "");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: { current: "", new: "", confirm: "" },
  });

  // 1. Busca Dados do Usuário (React Query)
  const { data: currentUser } = useQuery<{ email: string; name?: string }>({
    queryKey: ['currentUser'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const { name, email } = useMemo(() => {
    const userEmail = currentUser?.email || "";
    let displayName = currentUser?.name || "";
    if (!displayName && userEmail) {
      const derivedName = userEmail.split('@')[0];
      displayName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
    }
    return { name: displayName, email: userEmail };
  }, [currentUser]);

  // 2. Busca Lista de Bots (React Query)
  const { data: bots = [] } = useQuery<Bot[]>({
    queryKey: ['myBots'],
    queryFn: async () => (await api.get('/bots')).data,
    select: (data) => {
      if (data.length > 0 && !selectedBotId) {
        setSelectedBotId(data[0].id.toString());
      }
      return data;
    },
  });

  // 3. Busca Status da Assinatura (React Query)
  const { data: subStatus, isLoading: loadingBilling } = useQuery<SubscriptionStatus>({
    queryKey: ['billingStatus', selectedBotId],
    queryFn: async () => (await api.get(`/billing/status?bot_id=${selectedBotId}`)).data,
    enabled: !!selectedBotId,
  });

  // 4. Busca Planos Disponíveis (React Query)
  const { data: plans = [], isLoading: loadingPlans } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => (await api.get('/billing/plans')).data,
  });

  // --- Ação de Checkout (Nova Aba) ---
  const handleSubscribe = async (planKey: string) => {
    if (!selectedBotId) {
        toast({ title: "Selecione um Bot", description: "Crie um bot antes de assinar.", variant: "destructive" });
        return;
    }

    setProcessingPlan(planKey);

    try {
        const response = await api.post('/billing/checkout', {
            plan_key: planKey,
            bot_id: parseInt(selectedBotId)
        });

        if (response.data.checkout_url) {
            if (!isTrustedRedirectUrl(response.data.checkout_url)) {
                toast({ title: "URL não confiável", description: "O endereço de checkout não é válido.", variant: "destructive" });
                return;
            }
            window.open(response.data.checkout_url, '_blank');
        }
    } catch {
        toast({ title: "Erro no pagamento", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
        setProcessingPlan(null);
    }
  };

  // --- Helpers e Handlers ---
  const newPasswordValue = passwordForm.watch("new");
  const confirmPasswordValue = passwordForm.watch("confirm");
  const hasMinLen = (newPasswordValue?.length ?? 0) >= 8;
  const hasUpper = /[A-Z]/.test(newPasswordValue || "");
  const hasLower = /[a-z]/.test(newPasswordValue || "");
  const hasNumber = /[0-9]/.test(newPasswordValue || "");
  const hasSpecial = /[^A-Za-z0-9]/.test(newPasswordValue || "");
  const isPasswordStrong = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;
  const doPasswordsMatch = newPasswordValue === confirmPasswordValue;

  const handleUpdatePassword = async (values: ChangePasswordValues) => {
    setIsLoadingSecurity(true);
    try {
        await api.post('/auth/change-password', {
            current_password: values.current,
            new_password: values.new
        });
        toast({ title: "Senha alterada!", className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
        passwordForm.reset();
    } catch (error: unknown) {
        const msg = getSafeErrorMessage(error, "Erro ao alterar senha.");
        toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
        setIsLoadingSecurity(false);
    }
  };

  const isCurrentPlan = (targetPlan: string) => {
    if (!subStatus?.is_active) return false;
    return subStatus.plan_type === targetPlan;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil e suas credenciais de acesso."
      />

      <Tabs defaultValue={defaultTab} orientation="vertical" className="flex flex-col lg:flex-row w-full gap-8">
        <aside className="w-full lg:w-60 shrink-0">
            <TabsList className="flex flex-col h-auto w-full items-stretch bg-transparent space-y-1 p-0">
                <TabsTrigger value="profile" className="justify-start px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md hover:bg-slate-50 text-muted-foreground"><UserCircle className="mr-2 h-4 w-4" /> Meu Perfil</TabsTrigger>
                <TabsTrigger value="security" className="justify-start px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md hover:bg-slate-50 text-muted-foreground"><KeyRound className="mr-2 h-4 w-4" /> Segurança</TabsTrigger>
                <TabsTrigger value="subscription" className="justify-start px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md hover:bg-slate-50 text-muted-foreground"><CreditCard className="mr-2 h-4 w-4" /> Assinatura</TabsTrigger>
            </TabsList>
        </aside>

        <div className="flex-1 w-full min-w-0">
            <TabsContent value="profile" className="m-0 border-none p-0 outline-none w-full">
                <Card className="w-full shadow-sm border-slate-200">
                    <CardHeader className="p-6 pb-4 border-b border-slate-100"><CardTitle className="text-lg font-semibold">Informações Pessoais</CardTitle><CardDescription className="text-xs">Dados visíveis na plataforma.</CardDescription></CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center gap-5"><Avatar className="h-16 w-16 border-2 border-slate-100 shadow-sm"><AvatarImage src="" /><AvatarFallback className="text-lg bg-slate-50 text-slate-500 font-bold">{name ? name.substring(0, 2).toUpperCase() : "..."}</AvatarFallback></Avatar><div className="space-y-1"><h3 className="text-sm font-medium text-slate-900">Sua Foto</h3><p className="text-xs text-muted-foreground max-w-sm">Clique na imagem para alterar.</p></div></div>
                        <div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Nome</Label><Input id="name" value={name} readOnly className="h-9 text-sm" /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={email} disabled className="h-9 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" /></div></div>
                        <div className="flex justify-end pt-2"><Button disabled size="sm" variant="brand" className="h-9 px-4"><Save className="mr-2 h-4 w-4" /> Salvar (em breve)</Button></div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="m-0 border-none p-0 outline-none w-full">
                <Card className="w-full shadow-sm border-slate-200">
                     <CardHeader className="p-6 pb-4 border-b border-slate-100"><CardTitle className="text-lg font-semibold">Alterar Senha</CardTitle><CardDescription className="text-xs">Mantenha sua conta protegida.</CardDescription></CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(handleUpdatePassword)} className="space-y-6">
                          <FormField control={passwordForm.control} name="current" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha Atual</FormLabel>
                              <FormControl><Input type="password" {...field} className="w-full md:w-1/2 h-9 text-sm" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <Separator />
                          <div className="grid gap-5 md:grid-cols-2">
                            <FormField control={passwordForm.control} name="new" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nova Senha</FormLabel>
                                <FormControl><Input type="password" {...field} className="h-9 text-sm" /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={passwordForm.control} name="confirm" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar Senha</FormLabel>
                                <FormControl><Input type="password" {...field} className={`h-9 text-sm ${confirmPasswordValue && !doPasswordsMatch ? "border-red-300 focus-visible:ring-red-100" : ""}`} /></FormControl>
                              </FormItem>
                            )} />
                          </div>
                          {confirmPasswordValue && !doPasswordsMatch && (
                            <p className="text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-1">As senhas não coincidem.</p>
                          )}
                          {newPasswordValue && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1 gap-x-4 pt-1 pl-1 animate-in fade-in slide-in-from-top-1">
                              <PasswordReq met={hasMinLen} text="Min. 8 caracteres" />
                              <PasswordReq met={hasUpper} text="Maiúscula" />
                              <PasswordReq met={hasLower} text="Minúscula" />
                              <PasswordReq met={hasNumber} text="Número" />
                              <PasswordReq met={hasSpecial} text="Símbolo (!@#)" />
                            </div>
                          )}
                          <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isLoadingSecurity || !isPasswordStrong || !passwordForm.getValues("current")} size="sm" variant="brand" className="h-9 px-4">
                              {isLoadingSecurity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Atualizar Senha
                            </Button>
                          </div>
                        </form>
                      </Form>
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
                        {loadingPlans ? (
                            <div className="flex items-center justify-center h-40 border rounded-lg border-dashed"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : plans.length === 0 ? (
                            <div className="text-center py-10 text-sm text-muted-foreground">Nenhum plano disponível</div>
                        ) : (
                        <div className="grid md:grid-cols-2 gap-6 pb-10">
                            {[...plans].sort((a, b) => (a.key === 'basic' ? -1 : b.key === 'basic' ? 1 : 0)).map((plan) => {
                                const style = PLAN_STYLES[plan.key] || PLAN_STYLES.basic;
                                const features = PLAN_FEATURES[plan.key] || [];
                                const isCurrent = isCurrentPlan(plan.key);

                                return (
                                    <Card key={plan.id} className={`flex flex-col border-2 transition-all relative ${isCurrent ? style.activeBorder : style.border}`}>
                                        {isCurrent && (<div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${style.activeBg} text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wide shadow-sm`}>Plano Atual</div>)}
                                        {!isCurrent && style.recommended && (<div className={`absolute top-0 right-0 ${style.activeBg} text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide`}>Recomendado</div>)}
                                        <CardHeader><CardTitle className={`text-xl ${style.titleColor}`}>{plan.title}</CardTitle><CardDescription>{plan.description}</CardDescription></CardHeader>
                                        <CardContent className="space-y-4 flex-1">
                                            <div className="text-3xl font-bold">{formatPrice(plan.price, plan.currency)}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                                            <ul className="space-y-2 text-sm text-slate-600">
                                                {features.map((feature) => (
                                                    <li key={feature} className="flex gap-2"><Check className={`h-4 w-4 ${style.checkColor}`}/> {feature.startsWith('Tudo') ? <strong>{feature}</strong> : feature}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                        <CardFooter>
                                            <Button
                                                onClick={() => handleSubscribe(plan.key)}
                                                disabled={!!processingPlan || isCurrent}
                                                variant={style.buttonClass ? undefined : "outline"}
                                                className={`w-full ${isCurrent ? style.activeButtonClass : style.buttonClass}`}
                                            >
                                                {isCurrent ? "Plano Atual" : processingPlan === plan.key ? <Loader2 className="animate-spin h-4 w-4"/> : `Assinar ${plan.title.replace('ZenBotZ ', '')}`}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                        )}
                        </>
                    )}
                    </>
                )}
            </TabsContent>
        </div>
      </Tabs>
    </PageContainer>
  );
}
