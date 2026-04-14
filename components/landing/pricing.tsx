"use client";

const plans = [
  {
    name: "Starter",
    price: "Grátis",
    period: "para começar",
    description: "Ideal para testar a plataforma e validar a ideia.",
    features: [
      "1 bot ativo",
      "Até 25 pedidos/mês",
      "Cardápio com até 30 itens",
      "Pagamento PIX",
      "Suporte por e-mail",
    ],
    cta: "Começar Grátis",
    href: "https://app.zenbotz.com.br/cadastro",
    featured: false,
  },
  {
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    description: "Para restaurantes que querem automatizar de verdade.",
    features: [
      "Bots ilimitados",
      "Pedidos ilimitados",
      "Cardápio ilimitado",
      "Pagamento PIX + Cartão",
      "Dashboard em tempo real",
      "Analytics e relatórios",
      "Escalonamento humano",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    href: "https://app.zenbotz.com.br/cadastro",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para redes e franquias com necessidades específicas.",
    features: [
      "Tudo do Pro",
      "API dedicada",
      "SLA garantido",
      "Integrações customizadas",
      "Onboarding assistido",
      "Gerente de conta dedicado",
    ],
    cta: "Falar com Vendas",
    href: "https://wa.me/5511999999999?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20plano%20Enterprise",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="planos" className="relative bg-slate-50 py-32 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-600">
            Planos
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
            Preço justo,{" "}
            <span className="text-cyan-600">zero comissão</span> por pedido
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Diferente de marketplaces que cobram até 30% por pedido, o ZenBotZ
            cobra apenas uma mensalidade fixa. Quanto mais você vende, mais
            economiza.
          </p>
        </div>

        {/* Plans grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
                plan.featured
                  ? "border-cyan-400 bg-gradient-to-b from-cyan-50 to-white shadow-2xl shadow-cyan-500/20 scale-[1.02]"
                  : "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10"
              }`}
            >
              {/* Popular badge */}
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-cyan-500/30">
                  Mais Popular
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-bold text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-slate-700">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600"
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

              {/* CTA */}
              <a
                href={plan.href}
                className={`mt-8 block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all ${
                  plan.featured
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 hover:shadow-cyan-400/30"
                    : "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
