"use client";

type Accent = "slate" | "cyan" | "amber";

interface LandingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  accent: Accent;
  badge?: string;
  footnote?: string;
}

const plans: LandingPlan[] = [
  {
    name: "Founder Lifetime",
    price: "R$ 59,90",
    period: "/mês · para sempre",
    description:
      "Preço travado de fundador, mesmo em reajustes futuros. Apenas 30 vagas.",
    features: [
      "Tudo do Plano Pro",
      "R$ 59,90/mês travado para sempre",
      "Vaga garantida mesmo em aumentos futuros",
      "Acesso antecipado a novos recursos",
      "Selo de Fundador no perfil",
    ],
    cta: "Garantir vaga",
    href: "https://app.zenbotz.com.br/cadastro?plan=founder",
    accent: "amber",
    badge: "🔥 Edição Limitada · 30 vagas",
    footnote: "Disponível enquanto houver vagas.",
  },
  {
    name: "Pro Anual",
    price: "R$ 89",
    period: "/mês equivalentes",
    description:
      "R$ 1.068 à vista — economia de R$ 41/mês vs. o mensal. Pedidos ilimitados.",
    features: [
      "Tudo do Grátis",
      "Pedidos ilimitados (fair-use 5.000/mês)",
      "Sem marca ZenBotZ® nas mensagens",
      "Dashboard de análise completo",
      "Suporte por e-mail em até 24h",
      "1 bot por assinatura",
    ],
    cta: "Assinar Pro Anual",
    href: "https://app.zenbotz.com.br/cadastro?plan=pro_annual",
    accent: "cyan",
    badge: "Melhor custo-benefício",
    footnote: "Cobrado R$ 1.068,00 à vista, renovação anual.",
  },
  {
    name: "Pro Mensal",
    price: "R$ 129,90",
    period: "/mês",
    description:
      "Pedidos ilimitados, cancele quando quiser. Ideal para começar sem compromisso anual.",
    features: [
      "Tudo do Grátis",
      "Pedidos ilimitados (fair-use 5.000/mês)",
      "Sem marca ZenBotZ® nas mensagens",
      "Dashboard de análise completo",
      "Suporte por e-mail em até 24h",
      "1 bot por assinatura",
    ],
    cta: "Assinar Pro Mensal",
    href: "https://app.zenbotz.com.br/cadastro?plan=pro_monthly",
    accent: "cyan",
  },
  {
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    description:
      "Valide seu atendimento com o ZenBotZ® sem cartão de crédito.",
    features: [
      "Chatbot WhatsApp completo",
      "15 pedidos/mês grátis",
      "R$ 1,39 por pedido excedente",
      "PIX + Cadastro Mágico",
      "1 bot",
      "Mensagens assinadas pelo ZenBotZ®",
    ],
    cta: "Começar Grátis",
    href: "https://app.zenbotz.com.br/cadastro",
    accent: "slate",
    footnote: "Sem cartão. Upgrade a qualquer momento.",
  },
];

const ACCENTS: Record<
  Accent,
  {
    cardFeatured: string;
    cardDefault: string;
    badge: string;
    ctaFeatured: string;
    ctaDefault: string;
    check: string;
    priceText: string;
  }
> = {
  slate: {
    cardFeatured:
      "border-slate-300 bg-white shadow-xl shadow-slate-500/10",
    cardDefault:
      "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-500/10",
    badge: "bg-slate-900 text-white",
    ctaFeatured:
      "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20",
    ctaDefault:
      "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300",
    check: "text-slate-500",
    priceText: "text-slate-900",
  },
  cyan: {
    cardFeatured:
      "border-cyan-400 bg-gradient-to-b from-cyan-50 to-white shadow-2xl shadow-cyan-500/20 md:scale-[1.02]",
    cardDefault:
      "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10",
    badge:
      "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30",
    ctaFeatured:
      "bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/30",
    ctaDefault:
      "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300",
    check: "text-cyan-600",
    priceText: "text-slate-900",
  },
  amber: {
    cardFeatured:
      "border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-2xl shadow-amber-500/20 md:scale-[1.02]",
    cardDefault:
      "border-amber-200 bg-white hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10",
    badge:
      "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
    ctaFeatured:
      "bg-amber-500 text-white hover:bg-amber-400 shadow-lg shadow-amber-500/25 hover:shadow-amber-400/30",
    ctaDefault:
      "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300",
    check: "text-amber-600",
    priceText: "text-slate-900",
  },
};

export function Pricing() {
  return (
    <section id="planos" className="relative bg-slate-50 px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-600">
            Planos
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
            Preço justo,{" "}
            <span className="text-cyan-600">zero comissão</span> por pedido
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Diferente de marketplaces que cobram até 30% por pedido, o ZenBotZ®
            cobra só mensalidade fixa. Começa no Grátis; os primeiros 30
            restaurantes travam o preço de fundador para sempre.
          </p>
        </div>

        <div className="mt-16 grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {plans.map((plan) => {
            const palette = ACCENTS[plan.accent];
            const featured = Boolean(plan.badge);
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all duration-300 ${
                  featured ? palette.cardFeatured : palette.cardDefault
                }`}
              >
                {plan.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${palette.badge}`}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span
                      className={`font-heading text-4xl font-bold ${palette.priceText}`}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm text-slate-500">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {plan.description}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-slate-700"
                    >
                      <svg
                        className={`mt-0.5 h-4 w-4 shrink-0 ${palette.check}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.href}
                  className={`mt-7 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-all ${
                    featured ? palette.ctaFeatured : palette.ctaDefault
                  }`}
                >
                  {plan.cta}
                </a>

                {plan.footnote && (
                  <p className="mt-3 text-center text-[11px] text-slate-500">
                    {plan.footnote}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-slate-500">
          Cada assinatura cobre exatamente 1 bot — restaurantes com mais lojas
          contratam uma assinatura por bot. Todos os valores em BRL. Cancele
          quando quiser; o plano vale até o fim do período já pago.
        </p>
      </div>
    </section>
  );
}
