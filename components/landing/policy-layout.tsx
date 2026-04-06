import Link from "next/link";

interface PolicyLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-cyan-900/20 bg-[#0a0e1a]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-1">
            <span className="font-logo text-2xl font-bold tracking-tight text-zinc-200">
              Zen
            </span>
            <span className="font-logo text-2xl font-bold tracking-tight text-white">
              Bot
            </span>
            <span
              className="font-logo text-2xl font-bold tracking-tight text-cyan-400"
              style={{
                textShadow:
                  "0 0 8px rgba(34,211,238,0.5), 0 0 24px rgba(6,182,212,0.2)",
              }}
            >
              Z
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 transition-colors hover:text-cyan-400"
          >
            Voltar ao Inicio
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Ultima atualização: {lastUpdated}
        </p>

        <div className="mt-12 space-y-8 text-zinc-300 leading-relaxed [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-zinc-200 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:text-zinc-400 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:text-zinc-400 [&_a]:text-cyan-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-cyan-300 [&_strong]:text-white">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-900/20 bg-surface/50 px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} ZenBotZ. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs text-zinc-600">
            <Link href="/privacidade" className="hover:text-cyan-400 transition-colors">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-cyan-400 transition-colors">
              Termos
            </Link>
            <Link href="/exclusao-dados" className="hover:text-cyan-400 transition-colors">
              Exclusão de Dados
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
