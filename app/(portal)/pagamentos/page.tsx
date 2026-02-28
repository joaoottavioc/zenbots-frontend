"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  QrCode
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Componente interno que usa useSearchParams
function PagamentosContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');

  // Query: verifica status de conexão
  const { data: statusData, isLoading: isCheckingStatus } = useQuery<{ is_active: boolean }>({
    queryKey: ['paymentStatus'],
    queryFn: async () => (await api.get('/payments/status')).data,
    enabled: !code,
  });

  const isConnected = code ? false : (statusData?.is_active ?? false);

  // Mutation: processa callback do MP
  const callbackMutation = useMutation({
    mutationFn: async (authCode: string) => {
      await api.post('/payments/callback', { code: authCode });
    },
    onSuccess: () => {
      toast({
        title: "Conectado!",
        description: "Sua conta Mercado Pago foi vinculada com sucesso.",
        className: "bg-emerald-50 border-emerald-200"
      });
      queryClient.invalidateQueries({ queryKey: ['paymentStatus'] });
      router.replace('/pagamentos');
    },
    onError: () => {
      toast({ title: "Erro na conexão", description: "Não foi possível finalizar a integração.", variant: "destructive" });
    },
  });

  // Mutation: conectar ao Mercado Pago
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/payments/auth-url');
      return res.data.url as string;
    },
    onSuccess: (url) => {
      // CSRF protection: generate a random state and append it to the OAuth URL
      const state = crypto.randomUUID();
      sessionStorage.setItem('mp_oauth_state', state);
      const separator = url.includes('?') ? '&' : '?';
      toast({ title: "Redirecionando...", description: "Aguarde enquanto levamos você ao Mercado Pago." });
      window.location.href = `${url}${separator}state=${encodeURIComponent(state)}`;
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível iniciar a conexão.", variant: "destructive" });
    },
  });

  // Mutation: desconectar
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await api.post('/payments/disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentStatus'] });
      toast({ title: "Desconectado", description: "Integração removida." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao desconectar." });
    },
  });

  // Processar callback automaticamente se code presente, with CSRF state validation
  React.useEffect(() => {
    if (code && !callbackMutation.isPending && !callbackMutation.isSuccess) {
      const storedState = sessionStorage.getItem('mp_oauth_state');
      if (!storedState || storedState !== returnedState) {
        toast({
          title: "Erro de segurança",
          description: "O parâmetro de estado OAuth não corresponde. Tente novamente.",
          variant: "destructive",
        });
        router.replace('/pagamentos');
        return;
      }
      sessionStorage.removeItem('mp_oauth_state');
      callbackMutation.mutate(code);
    }
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = callbackMutation.isPending || connectMutation.isPending;

  return (
    <div className="w-full p-6 space-y-8 animate-in fade-in duration-500">

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Wallet className="h-8 w-8 text-slate-700" />
          Pagamentos (Recebimentos)
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Configure como seus bots recebem pagamentos via WhatsApp.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {/* CARD DO MERCADO PAGO */}
        <Card className={`border-2 transition-all hover:shadow-md ${isConnected ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100"}`}>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
                <div className="h-12 w-12 bg-brand-mercadopago rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                    <QrCode className="h-7 w-7" />
                </div>
                {isCheckingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : isConnected ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 flex gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Conectado
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
                        Desconectado
                    </Badge>
                )}
            </div>
            <CardTitle className="mt-4 text-xl">Mercado Pago</CardTitle>
            <CardDescription>
              Pix Automático nativo no WhatsApp com confirmação instantânea.
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-2">
            <div className="text-sm text-slate-600 space-y-2">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Confirmação via Webhook</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Dinheiro direto na sua conta MP</span>
                </div>
            </div>
          </CardContent>

          <CardFooter className="pt-6">
            {isConnected ? (
                <Button variant="outline" onClick={() => disconnectMutation.mutate()} className="w-full border-red-200 text-red-600 hover:bg-red-50">
                    Desconectar
                </Button>
            ) : (
                <Button
                    className="w-full bg-brand-mercadopago hover:bg-brand-mercadopago-hover text-white font-medium"
                    onClick={() => connectMutation.mutate()}
                    disabled={isLoading || isCheckingStatus}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Conectar Conta
                </Button>
            )}
          </CardFooter>
        </Card>

        {/* Card Placeholder */}
        <Card className="border-dashed border-slate-200 bg-slate-50/50 opacity-60">
          <CardHeader>
            <div className="h-12 w-12 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-bold">
                $
            </div>
            <CardTitle className="mt-4 text-lg text-slate-500">Outros Gateways</CardTitle>
            <CardDescription>
              Em breve integrações com Stripe e Asaas.
            </CardDescription>
          </CardHeader>
        </Card>

      </div>

      <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 flex flex-col md:flex-row gap-6 items-start">
        <AlertCircle className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div className="space-y-2">
            <h3 className="font-semibold text-blue-900">Como funciona?</h3>
            <p className="text-sm text-blue-800/80 leading-relaxed">
                Ao clicar em conectar, você autoriza o <strong>ZenBots</strong> a gerar QR Codes.
                O dinheiro vai direto para sua conta Mercado Pago.
            </p>
        </div>
      </div>
    </div>
  );
}

// Wrapper Principal com Suspense (Necessário para useSearchParams no Next.js App Router)
export default function PagamentosPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>}>
            <PagamentosContent />
        </Suspense>
    );
}
