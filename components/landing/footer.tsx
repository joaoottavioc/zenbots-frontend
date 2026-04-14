import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-cyan-900/30 bg-[#0a0e1a] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-1">
              <span className="font-logo text-xl font-bold text-zinc-300">
                Zen
              </span>
              <span className="font-logo text-xl font-bold text-white">
                Bot
              </span>
              <span
                className="font-logo text-xl font-bold text-cyan-400"
                style={{
                  textShadow:
                    "0 0 8px rgba(34,211,238,0.4), 0 0 20px rgba(6,182,212,0.15)",
                }}
              >
                Z
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Inteligência Artificial para delivery via WhatsApp. Automatize
              pedidos, pagamentos e entregas do seu restaurante.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Produto
            </h4>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="#funcionalidades"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  Funcionalidades
                </a>
              </li>
              <li>
                <a
                  href="#planos"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  Planos e Preços
                </a>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  Como Funciona
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Legal
            </h4>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/privacidade"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  Politica de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/termos"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/exclusao-dados"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  Exclusão de Dados
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Contato
            </h4>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:contato@zenbotz.com.br"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  contato@zenbotz.com.br
                </a>
              </li>
              <li>
                <a
                  href="https://dev.zenbotz.com.br/login"
                  className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
                >
                  Acessar Plataforma
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-cyan-900/20 pt-8 sm:flex-row">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Zenaide Automações LTDA. Todos os direitos
            reservados.
          </p>
          <p className="text-xs text-zinc-600">
            Feito com IA no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
