"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // <--- Importante para ler o ?code=
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

// Componente interno que usa useSearchParams
function PagamentosContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams(); // Hook para ler a URL
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // 1. Ao carregar: Verifica se voltou do MP com código OU verifica status atual
  useEffect(() => {
    const code = searchParams.get('code'); // <--- Pega o código que o Mercado Pago mandou

    if (code) {
      // Cenário A: Voltou do Mercado Pago com autorização
      handleCallback(code);
    } else {
      // Cenário B: Acesso normal, verifica se já está conectado
      checkConnectionStatus();
    }
  }, [searchParams]); // Dependência adicionada para segurança

  const handleCallback = async (code: string) => {
    setIsLoading(true);
    try {
        // Envia o código para o backend trocar pelo token definitivo
        await api.post('/payments/callback', { code });
        
        toast({ 
            title: "Conectado!", 
            description: "Sua conta Mercado Pago foi vinculada com sucesso.",
            className: "bg-emerald-50 border-emerald-200"
        });
        
        setIsConnected(true);
        // Limpa a URL para tirar o ?code=... (Fica mais bonito)
        router.replace('/pagamentos');
        
    } catch (error) {
        toast({ title: "Erro na conexão", description: "Não foi possível finalizar a integração.", variant: "destructive" });
    } finally {
        setIsLoading(false);
        setIsCheckingStatus(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      // Chama a rota real do backend para ver se o bot já tem token
      const res = await api.get('/payments/status');
      setIsConnected(res.data.is_active);
    } catch (error) {
      console.error("Erro ao verificar status", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnectMercadoPago = async () => {
    setIsLoading(true);
    try {
        // 1. Pede a URL de login do Mercado Pago ao backend
        const res = await api.get('/payments/auth-url');
        
        toast({ title: "Redirecionando...", description: "Aguarde enquanto levamos você ao Mercado Pago." });
        
        // 2. Redireciona o navegador de verdade
        window.location.href = res.data.url;
        
    } catch (error) {
        toast({ title: "Erro", description: "Não foi possível iniciar a conexão.", variant: "destructive" });
        setIsLoading(false);
    }
  };
  
  const handleDisconnect = async () => {
      try {
          await api.post('/payments/disconnect'); // Você precisará criar essa rota opcional depois, ou apenas limpar o banco
          setIsConnected(false);
          toast({ title: "Desconectado", description: "Integração removida." });
      } catch (error) {
          toast({ title: "Erro", description: "Falha ao desconectar." });
      }
  };

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
                <div className="h-12 w-12 bg-[#009EE3] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
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
                <Button variant="outline" onClick={handleDisconnect} className="w-full border-red-200 text-red-600 hover:bg-red-50">
                    Desconectar
                </Button>
            ) : (
                <Button 
                    className="w-full bg-[#009EE3] hover:bg-[#008CC9] text-white font-medium" 
                    onClick={handleConnectMercadoPago}
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