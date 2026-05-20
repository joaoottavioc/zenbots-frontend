import { IceCream, Pizza, UtensilsCrossed } from "lucide-react";

import { PhoneMockup } from "./phone-mockup";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Animated ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 top-10 h-[520px] w-[520px] rounded-full bg-cyan-300/50 blur-3xl will-change-transform animate-hero-drift-1" />
        <div className="absolute -right-24 top-32 h-[600px] w-[600px] rounded-full bg-sky-300/45 blur-3xl will-change-transform animate-hero-drift-2" />
        <div className="absolute left-1/2 top-72 h-[440px] w-[440px] rounded-full bg-cyan-200/55 blur-3xl will-change-transform animate-hero-drift-3" />
      </div>

      {/* Subtle dot grid (static, for premium texture) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.07)_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
      />

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Headline */}
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
          Seu restaurante atendendo
          <br className="hidden sm:block" />{" "}
          no site{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-amber-700">24 horas por dia</span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-1 -z-0 h-3 -skew-x-6 bg-amber-200/80"
            />
          </span>
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          A IA recebe áudios e mensagens dos seus clientes, tira dúvidas, monta
          o carrinho e gera o PIX automaticamente. Você só prepara a comida.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/pizzaria-do-ze"
            className="group inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-600/25"
          >
            Experimente o demo agora
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
            href="https://app.zenbotz.com.br/cadastro"
            className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20"
          >
            Criar meu bot grátis
          </a>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
          >
            Ver como funciona
          </a>
        </div>

        {/* Microcopy — flags WhatsApp deferral so visitors understand
            the dashboard's "Em breve" state and the demo link goes to
            the live web widget channel. */}
        <p className="mt-4 text-xs text-slate-500">
          Atendimento Web disponível agora · WhatsApp em breve · Sem cartão de crédito
        </p>

        {/* Phone mockup with floating dish cards */}
        <div className="relative mt-16 flex justify-center sm:mt-20">
          <div className="relative">
            {/* Floating dish cards — desktop only, sit beside the phone */}
            <DishCard
              className="hidden sm:flex absolute right-full top-4 mr-7"
              icon={<Pizza className="h-5 w-5 text-amber-600" strokeWidth={1.8} />}
              name="Pizza Margherita"
              price="R$ 42,00"
            />
            <DishCard
              className="hidden sm:flex absolute left-full top-12 ml-7"
              icon={<IceCream className="h-5 w-5 text-amber-600" strokeWidth={1.8} />}
              name="Açaí 500ml"
              price="R$ 22,00"
            />
            <DishCard
              className="hidden sm:flex absolute right-full bottom-24 mr-7"
              icon={<UtensilsCrossed className="h-5 w-5 text-amber-600" strokeWidth={1.8} />}
              name="Marmitex Fit"
              price="R$ 18,00"
            />
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Floating dish card (decorative menu preview)
   ───────────────────────────────────────────── */

function DishCard({
  className = "",
  icon,
  name,
  price,
}: {
  className?: string;
  icon: React.ReactNode;
  name: string;
  price: string;
}) {
  return (
    <div
      className={`pointer-events-none items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/5 backdrop-blur ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-100">
        {icon}
      </span>
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[11px] font-semibold text-slate-900">{name}</span>
        <span className="text-[10px] font-bold tabular-nums text-amber-700">
          {price}
        </span>
      </div>
    </div>
  );
}
