export function CTA() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-24 sm:py-32">
      {/* Cyan radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-500/20 via-cyan-500/5 to-transparent blur-3xl"
      />
      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Pronto para automatizar
          <br />
          <span
            className="text-cyan-400"
            style={{
              textShadow:
                "0 0 24px rgba(34,211,238,0.35), 0 0 60px rgba(6,182,212,0.15)",
            }}
          >
            seu delivery?
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base text-slate-400 sm:text-lg">
          Crie sua conta em segundos. Configure seu bot. Comece a receber
          pedidos automaticamente pelo WhatsApp.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="https://app.zenbotz.com.br/cadastro"
            className="group inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-7 py-4 text-base font-semibold text-white shadow-2xl shadow-cyan-500/30 transition-all hover:bg-cyan-400 hover:shadow-cyan-400/40 hover:scale-[1.02]"
          >
            Criar meu bot grátis
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
          <a
            href="#planos"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-7 py-4 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-slate-600 hover:bg-slate-900"
          >
            Ver planos
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Sem cartão de crédito · Cancele quando quiser
        </p>
      </div>
    </section>
  );
}
