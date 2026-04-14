import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PolicyLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-1">
            <span className="font-logo text-2xl font-bold tracking-tight text-slate-900">
              Zen
            </span>
            <span className="font-logo text-2xl font-bold tracking-tight text-slate-900">
              Bot
            </span>
            <span
              className="font-logo text-2xl font-bold tracking-tight text-cyan-600"
              style={{
                textShadow:
                  "0 0 12px rgba(34,211,238,0.35), 0 0 32px rgba(6,182,212,0.15)",
              }}
            >
              Z
            </span>
          </Link>
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-cyan-600"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Voltar ao início
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {/* Title block */}
        <div className="border-b border-slate-200 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            Documento Legal
          </div>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Última atualização: <span className="font-medium text-slate-700">{lastUpdated}</span>
          </p>
        </div>

        {/* Body */}
        <article
          className="
            mt-10 text-[15px] leading-[1.75] text-slate-700
            [&>p]:my-5
            [&>h2]:mt-14 [&>h2]:mb-4 [&>h2]:font-heading [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-slate-900 [&>h2]:scroll-mt-24
            [&>h2]:relative [&>h2]:pl-4
            [&>h2]:before:absolute [&>h2]:before:left-0 [&>h2]:before:top-1 [&>h2]:before:bottom-1 [&>h2]:before:w-1 [&>h2]:before:rounded-full [&>h2]:before:bg-gradient-to-b [&>h2]:before:from-cyan-500 [&>h2]:before:to-blue-500
            [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:font-heading [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-slate-900
            [&>ul]:my-5 [&>ul]:ml-1 [&>ul]:space-y-2.5 [&>ul]:list-none
            [&>ul>li]:relative [&>ul>li]:pl-6
            [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:top-[0.7em] [&>ul>li]:before:h-1.5 [&>ul>li]:before:w-1.5 [&>ul>li]:before:rounded-full [&>ul>li]:before:bg-cyan-500
            [&>ol]:my-5 [&>ol]:ml-5 [&>ol]:list-decimal [&>ol]:space-y-2.5 [&>ol]:marker:text-cyan-600 [&>ol]:marker:font-semibold
            [&_a]:font-medium [&_a]:text-cyan-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-cyan-300 hover:[&_a]:text-cyan-700 hover:[&_a]:decoration-cyan-500
            [&_strong]:font-semibold [&_strong]:text-slate-900
          "
        >
          {children}
        </article>

        {/* Back to top / contact strip */}
        <div className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">
            Dúvidas sobre este documento?{" "}
            <a
              href="mailto:contato@zenbotz.com.br"
              className="font-medium text-cyan-600 underline underline-offset-2 decoration-cyan-300 hover:text-cyan-700 hover:decoration-cyan-500"
            >
              contato@zenbotz.com.br
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Zenaide Automações LTDA. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link href="/privacidade" className="transition-colors hover:text-cyan-600">
              Privacidade
            </Link>
            <Link href="/termos" className="transition-colors hover:text-cyan-600">
              Termos
            </Link>
            <Link href="/exclusao-dados" className="transition-colors hover:text-cyan-600">
              Exclusão de Dados
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
