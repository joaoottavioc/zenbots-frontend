"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
      <h2 className="text-lg font-semibold text-slate-700">Conectando ao WhatsApp...</h2>
      <p className="text-sm text-slate-500">Por favor, aguarde o fechamento desta janela.</p>
    </div>
  );
}

function WhatsappCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // Se tiver code e tiver quem abriu a janela (opener)
    if (code && window.opener) {
      console.log("✅ Callback recebido. Enviando para a janela principal...");

      // Envia o código + state para a janela pai (Dashboard) for CSRF validation
      window.opener.postMessage({
        type: "WA_OAUTH_CODE",
        data: { code, state }
      }, window.location.origin);

      // Fecha esta popup
      window.close();
    } else {
        // Se alguém acessar essa página direto sem ser popup, manda pra home
        router.push("/meus-bots");
    }
  }, [searchParams, router]);

  return <LoadingSpinner />;
}

export default function WhatsappCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <WhatsappCallbackContent />
    </Suspense>
  );
}
