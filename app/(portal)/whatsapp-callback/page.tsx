"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function WhatsappCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    
    // Se tiver code e tiver quem abriu a janela (opener)
    if (code && window.opener) {
      console.log("✅ Callback recebido. Enviando para a janela principal...");
      
      // Envia o código para a janela pai (Dashboard)
      window.opener.postMessage({
        type: "WA_OAUTH_CODE",
        data: { code }
      }, window.location.origin);

      // Fecha esta popup
      window.close();
    } else {
        // Se alguém acessar essa página direto sem ser popup, manda pra home
        window.location.href = "/meus-bots";
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
      <h2 className="text-lg font-semibold text-slate-700">Conectando ao WhatsApp...</h2>
      <p className="text-sm text-slate-500">Por favor, aguarde o fechamento desta janela.</p>
    </div>
  );
}