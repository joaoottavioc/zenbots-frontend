"use client";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24">
      {/* Hero glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-sm text-cyan-300 backdrop-blur-sm animate-fade-in">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          Inteligência Artificial para Delivery
        </div>

        {/* Headline */}
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in-up">
          Seu restaurante com{" "}
          <span
            className="text-cyan-400"
            style={{
              textShadow:
                "0 0 20px rgba(34,211,238,0.3), 0 0 60px rgba(6,182,212,0.1)",
            }}
          >
            atendente IA
          </span>
          <br />
          no WhatsApp
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          Automatize pedidos, pagamentos PIX e entregas com um bot inteligente
          que conversa naturalmente com seus clientes — 24 horas por dia, 7 dias
          por semana.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <a
            href="https://app.zenbotz.com.br/cadastro"
            className="group relative inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-cyan-500/25 transition-all hover:bg-cyan-400 hover:shadow-cyan-400/30 hover:scale-[1.02]"
          >
            <span>Começar Grátis</span>
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
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-8 py-4 text-lg font-semibold text-zinc-300 transition-all hover:border-cyan-700 hover:text-white hover:bg-zinc-800"
          >
            Como Funciona
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-whatsapp" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Oficial
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Pagamento PIX Seguro
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Respostas em Segundos
          </div>
        </div>

        {/* Chat mockup */}
        <div className="mt-16 mx-auto max-w-md animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
          <div className="rounded-2xl border border-cyan-900/30 bg-surface/80 p-6 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl">
            {/* WhatsApp header */}
            <div className="flex items-center gap-3 border-b border-cyan-900/20 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20">
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Burger House AI</p>
                <p className="text-xs text-cyan-500">online</p>
              </div>
            </div>

            {/* Chat messages */}
            <div className="mt-4 space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-cyan-600/20 px-4 py-2 text-sm text-zinc-200">
                  Oi, quero um smash duplo com bacon
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-surface-light px-4 py-2 text-sm text-zinc-300">
                  Boa escolha! Adicionei ao carrinho:<br />
                  <span className="text-cyan-400 font-medium">1x Smash Duplo Bacon — R$ 32,90</span><br />
                  Deseja mais alguma coisa? 🍔
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-cyan-600/20 px-4 py-2 text-sm text-zinc-200">
                  Só isso! Quero pagar por PIX
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-surface-light px-4 py-2 text-sm text-zinc-300">
                  PIX gerado! Escaneie o QR code abaixo. Assim que confirmar, já preparamos seu pedido ⚡
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
