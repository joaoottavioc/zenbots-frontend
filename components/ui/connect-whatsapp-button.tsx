"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button"; 
import { MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api"; 
import { useSearchParams, useRouter } from 'next/navigation';

export default function ConnectWhatsappButton() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  // Variáveis de Ambiente
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const solutionId = process.env.NEXT_PUBLIC_FB_LOGIN_CONFIG_ID; // <--- NOVO

  // 1. Captura o CODE no retorno (Passo 6 da estratégia - Lado Cliente)
  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code && !isLoading && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        setIsLoading(true);
        
        // Limpa a URL visualmente
        window.history.replaceState({}, document.title, window.location.pathname);
        
        console.log("📦 Code recebido. Enviando para backend...");

        // O redirect_uri enviado aqui deve ser IGUAL ao usado para gerar o link
        const currentRedirectUri = window.location.origin + window.location.pathname;

        api.post('/bots/whatsapp/auth', { 
            code: code,
            redirect_uri: currentRedirectUri 
        })
        .then((res) => {
             toast({ title: "Sucesso!", description: `Bot ${res.data.number} conectado (Sandbox).` });
             setTimeout(() => window.location.reload(), 1500);
        })
        .catch((err) => {
             console.error("❌ Erro Backend:", err);
             toast({ title: "Falha", description: "Erro na troca do token.", variant: "destructive" });
             setIsLoading(false); 
        });
    }
  }, [searchParams, isLoading, toast]); 

  // 2. Monta a URL e Redireciona (Passo 4 da estratégia)
  const handleConnect = () => {
    setIsLoading(true);

    if (!appId || !solutionId) {
        toast({ title: "Erro Config", description: "Falta APP_ID ou SOLUTION_ID no .env", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const redirectUri = window.location.origin + window.location.pathname;
    const state = "random_string_" + Math.random().toString(36).substring(7); // CSRF simples

    // Montagem manual da URL conforme sua estratégia
    const baseUrl = "https://www.facebook.com/v19.0/dialog/oauth";
    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        state: state,
        // O pulo do gato: EXTRAS com o Solution ID
        extras: JSON.stringify({
            setup: {
                solutionID: solutionId
            }
        })
    });

    console.log("🚀 Redirecionando para Embedded Signup...");
    window.location.href = `${baseUrl}?${params.toString()}`;
  };

  return (
    <Button 
      onClick={handleConnect}
      disabled={isLoading}
      className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold transition-all"
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-5 w-5" />}
      {isLoading ? "Conectar (Sandbox)" : "Conectar WhatsApp"}
    </Button>
  );
}