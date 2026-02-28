"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">
          Algo deu errado
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente ou entre em contato com o
          suporte se o problema persistir.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={reset}>Tentar novamente</Button>
          <Button variant="outline" asChild>
            <Link href="/login">Voltar ao login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
