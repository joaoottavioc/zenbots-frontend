"use client";

import React, { useEffect, useState } from 'react';
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

  // Variáveis
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const configId = process.env.NEXT_PUBLIC_FB_CONFIG_ID;

  // 1. EFEITO: Detecta se o usuário acabou de voltar do Facebook com um código
  useEffect(() => {
    const code = searchParams.get('code');
    
    // Se tiver código e ainda não estiver processando...
    if (code && !isLoading) {
        setIsLoading(true);
        
        // A URL exata de onde estamos (sem a query string ?code=...)
        // Esta é a chave mágica que garante o match.
        const currentRedirectUri = window.location.origin + window.location.pathname;

        console.log("📦 Código detectado na URL:", code);
        console.log("🔗 Usando URI para troca:", currentRedirectUri);

        api.post('/bots/whatsapp/auth', { 
            code: code,
            redirect_uri: currentRedirectUri 
        })
        .then((res) => {
             toast({ title: "Conectado!", description: `Bot ${res.data.number} ativado.` });
             // Limpa a URL para o usuário não tentar usar o mesmo código se der F5
             router.replace(window.location.pathname);
             setTimeout(() => window.location.reload(), 1500);
        })
        .catch((err) => {
             console.error("❌ Erro Backend:", err);
             const errorMsg = err.response?.data?.detail || "Erro na troca do token.";
             toast({ title: "Falha na Conexão", description: errorMsg, variant: "destructive" });
             setIsLoading(false);
        });
    }
  }, [searchParams, router, isLoading, toast]); // Dependências do efeito

  // 2. AÇÃO: Redireciona o usuário (Fluxo Manual)
  const handleConnect = () => {
    setIsLoading(true);
    
    // Define explicitamente para onde o Facebook deve voltar
    const redirectUri = window.location.origin + window.location.pathname;
    
    // Monta a URL Oficial da Meta
    const fbUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
                  `client_id=${appId}&` +
                  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                  `response_type=code&` +
                  `scope=whatsapp_business_management,whatsapp_business_messaging&` +
                  `config_id=${configId}`; // Embedded Signup

    // Tchau! Envia o usuário.
    window.location.href = fbUrl;
  };

  return (
    <Button 
      onClick={handleConnect}
      disabled={isLoading}
      className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold transition-all"
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-5 w-5" />}
      {isLoading ? "Processando..." : "Conectar WhatsApp"}
    </Button>
  );
}