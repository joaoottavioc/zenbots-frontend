"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button"; 
import { MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api"; 

// Tipagem global para o SDK do Facebook
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface ConnectWhatsappButtonProps {
  botId: number;
}

export default function ConnectWhatsappButton({ botId }: ConnectWhatsappButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  
  // Ref para rastrear se o evento "Happy Path" ocorreu
  const eventReceivedRef = useRef(false);

  // Variáveis de Ambiente
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const configId = process.env.NEXT_PUBLIC_FB_LOGIN_CONFIG_ID; 
  // URL apenas para referência (não usada para redirect real neste fluxo)
  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/whatsapp-callback` : ''; 

  // 1. Carregamento do SDK do Facebook (Apenas uma vez)
  useEffect(() => {
    if (window.FB) { setIsSdkLoaded(true); return; }

    window.fbAsyncInit = function() {
      window.FB.init({ appId: appId, cookie: true, xfbml: true, version: 'v19.0' });
      setIsSdkLoaded(true);
      console.log("✅ Facebook SDK Initialized");
    };

    const script = document.createElement('script');
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true; 
    script.defer = true; 
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [appId]);

  // 2. Listener do Evento "Happy Path" (WA_EMBEDDED_SIGNUP)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && !event.origin.includes("facebook.com")) return;

      if (event.data?.type === 'WA_EMBEDDED_SIGNUP') {
          console.log("✨ Evento Happy Path Recebido!", event.data);
          eventReceivedRef.current = true; // Marca que o evento chegou
          
          const { business_id, waba_id, phone_number_id, display_phone_number, code } = event.data.data || event.data;
          
          // Envia o pacote completo para o backend
          finishOnboarding({
             business_id, waba_id, phone_number_id, display_phone_number, code, access_token: null
          });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [botId]);

  // 3. Função Unificada de Envio ao Backend
  const finishOnboarding = async (payload: any) => {
      try {
          // O frontend é "burro": ele apenas repassa o que tem para o backend
          await api.post("/bots/whatsapp/complete-onboarding", {
            bot_id: botId,
            redirect_uri: redirectUri,
            ...payload
          });

          toast({ 
            title: "Conectado! 🚀", 
            description: "WhatsApp integrado com sucesso.",
            className: "bg-emerald-50 border-emerald-200"
          });
          
          setTimeout(() => window.location.reload(), 2000);

      } catch (error: any) {
          console.error(error);
          const msg = error.response?.data?.detail || "Não foi possível concluir a conexão.";
          toast({ title: "Erro na Conexão", description: msg, variant: "destructive" });
          setIsLoading(false);
      }
  };

  // 4. Gatilho de Login (Popup)
  const handleConnect = () => {
    if (!appId || !configId) {
        toast({ title: "Erro Config", description: "Falta APP_ID ou CONFIG_ID", variant: "destructive" });
        return;
    }
    if (!isSdkLoaded || !window.FB) return;

    setIsLoading(true);
    eventReceivedRef.current = false; // Reseta flag

    // Abre o Popup via SDK
    window.FB.login((response: any) => {
        if (response.authResponse) {
            console.log("✅ Popup fechado. Aguardando evento ou timeout...");
            
            // Lógica de Fallback Silencioso:
            // Se o evento WA_EMBEDDED_SIGNUP não chegar em 5 segundos,
            // assumimos que é uma reconexão rápida e enviamos o TOKEN CURTO.
            setTimeout(() => {
                if (!eventReceivedRef.current) {
                    console.warn("⚠️ Fallback ativado: Enviando token curto para o backend.");
                    
                    finishOnboarding({
                        business_id: null, 
                        waba_id: null, 
                        phone_number_id: null, 
                        display_phone_number: null, 
                        code: null,
                        access_token: response.authResponse.accessToken // Token curto do SDK
                    });
                }
            }, 5000); // 5 segundos de tolerância

        } else {
            console.log('Login cancelado pelo usuário.');
            setIsLoading(false);
        }
    }, {
        // Permissões Essenciais
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        extras: { setup: { solutionID: configId } } // Ativa o fluxo Embedded
    });
  };

  return (
    <Button 
      onClick={handleConnect}
      disabled={isLoading || !isSdkLoaded}
      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-9 text-xs shadow-sm transition-all"
    >
      {isLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="mr-2 h-3.5 w-3.5" />}
      {isLoading ? "Conectando..." : "Conectar WhatsApp"}
    </Button>
  );
}