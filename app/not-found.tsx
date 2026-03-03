import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-heading font-bold text-foreground">404</h1>
        <p className="text-muted-foreground text-lg">Página não encontrada</p>
        <Link
          href="/login"
          className="inline-block mt-4 text-sm text-primary hover:underline font-medium"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
