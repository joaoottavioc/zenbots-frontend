"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button"; 
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSafeErrorMessage } from "@/lib/error-messages";

// Tipagem global para o SDK do Facebook
interface FBLoginResponse {
  authResponse?: {
    accessToken: string;
    userID: string;
    expiresIn: number;
    signedRequest: string;
  };
  status: string;
}

interface FBSDK {
  init: (params: { appId: string | undefined; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: FBLoginResponse) => void, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    FB: FBSDK;
    fbAsyncInit: () => void;
  }
}

/** Validates that an origin is either the app's own origin or a Facebook domain over HTTPS. */
export function isAllowedOrigin(origin: string, selfOrigin: string): boolean {
  if (origin === selfOrigin) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && /^([a-z0-9-]+\.)*facebook\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

interface ConnectWhatsappButtonProps {
  botId: number;
}

export default function ConnectWhatsappButton({ botId }: ConnectWhatsappButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  
  // Ref para rastrear se o evento "Happy Path" ocorreu
  const eventReceivedRef = useRef(false);
  // Ref para armazenar o token do authResponse para uso no happy path
  const authResponseRef = useRef<FBLoginResponse['authResponse'] | null>(null);
  // CSRF state for OAuth callback validation
  const oauthStateRef = useRef<string | null>(null);
  // Ref for the fallback timer so it can be cleared
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup fallback timer on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

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
    };

    const script = document.createElement('script');
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true; 
    script.defer = true; 
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [appId]);

  // 2. Listener do Evento "Happy Path" (WA_EMBEDDED_SIGNUP) + OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin, window.location.origin)) return;

      if (event.data?.type === 'WA_EMBEDDED_SIGNUP') {
          eventReceivedRef.current = true;
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }

          const { business_id, waba_id, phone_number_id, display_phone_number } = event.data.data || event.data;

          finishOnboarding({
             business_id, waba_id, phone_number_id, display_phone_number,
             code: null,
             access_token: authResponseRef.current?.accessToken ?? null
          });
      }

      // Validate CSRF state on OAuth callback messages
      if (event.data?.type === 'WA_OAUTH_CODE') {
          const receivedState = event.data.data?.state;
          if (!oauthStateRef.current || receivedState !== oauthStateRef.current) {
            return;
          }
          oauthStateRef.current = null;
          sessionStorage.removeItem('wa_oauth_state');

          finishOnboarding({
             business_id: null, waba_id: null, phone_number_id: null,
             display_phone_number: null,
             code: event.data.data?.code ?? null,
             access_token: null
          });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [botId]);

  // 3. Função Unificada de Envio ao Backend
  const finishOnboarding = async (payload: Record<string, string | null>) => {
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
          
          queryClient.invalidateQueries({ queryKey: ['myBots'] });

      } catch (error: unknown) {
              const msg = getSafeErrorMessage(error, "Não foi possível concluir a conexão.");
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
    eventReceivedRef.current = false;

    // Generate CSRF state for OAuth callback validation
    const state = crypto.randomUUID();
    oauthStateRef.current = state;
    sessionStorage.setItem('wa_oauth_state', state);

    // Abre o Popup via SDK
    window.FB.login((response: FBLoginResponse) => {
        if (response.authResponse) {
            const authData = response.authResponse;
            authResponseRef.current = authData;

            fallbackTimerRef.current = setTimeout(() => {
                if (!eventReceivedRef.current) {
                    finishOnboarding({
                        business_id: null,
                        waba_id: null,
                        phone_number_id: null,
                        display_phone_number: null,
                        code: null,
                        access_token: authData.accessToken
                    });
                }
            }, 5000);

        } else {
            setIsLoading(false);
        }
    }, {
        config_id: configId,
        extras: {
            setup: {},
            sessionInfoVersion: '3',
        }
    });
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading || !isSdkLoaded}
      className="w-full bg-brand-whatsapp hover:bg-brand-whatsapp-hover text-white font-bold h-9 text-xs shadow-sm transition-all"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      )}
      {isLoading ? "Conectando..." : "Conectar WhatsApp"}
    </Button>
  );
}