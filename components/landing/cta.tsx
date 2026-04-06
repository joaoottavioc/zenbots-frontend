"use client";

export function CTA() {
  return (
    <section className="relative py-32 px-6">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-cyan-700/30 bg-gradient-to-br from-cyan-950/40 via-surface to-surface p-12 text-center shadow-2xl shadow-cyan-950/20 sm:p-16">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/10 blur-[80px]" />

        <div className="relative z-10">
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Pronto para automatizar
            <br />
            <span
              className="text-cyan-400"
              style={{
                textShadow:
                  "0 0 20px rgba(34,211,238,0.3), 0 0 60px rgba(6,182,212,0.1)",
              }}
            >
              seu delivery?
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            Crie sua conta em segundos. Configure seu bot. Comece a receber
            pedidos automaticamente pelo WhatsApp.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="https://app.zenbotz.com.br/cadastro"
              className="group inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-cyan-500/25 transition-all hover:bg-cyan-400 hover:shadow-cyan-400/30 hover:scale-[1.02]"
            >
              Começar Agora
              <svg
                className="h-5 w-5 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
}
