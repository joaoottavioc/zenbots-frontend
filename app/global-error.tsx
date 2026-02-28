"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">
            Algo deu errado
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com
            o suporte se o problema persistir.
          </p>
          <Button onClick={reset} className="mt-6">
            Tentar novamente
          </Button>
        </div>
      </body>
    </html>
  );
}
