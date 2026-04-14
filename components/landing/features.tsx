/**
 * Bento-grid features section. Top row has two large cards highlighting the
 * two flagship capabilities (audio AI + automatic PIX), each with its own
 * embedded visual proof. Bottom row has three smaller supporting cards.
 */

const STATS = [
  { value: "0%", label: "Comissão por pedido" },
  { value: "1 min", label: "Cardápio em PDF importado" },
  { value: "24/7", label: "Atendimento sem folga" },
  { value: "< 5s", label: "Resposta da IA" },
] as const;

export function Features() {
  return (
    <section id="funcionalidades" className="relative bg-white px-6 py-28 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
            Funcionalidades
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Tudo que seu delivery precisa,{" "}
            <span className="text-amber-600">automatizado</span>
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Do primeiro &ldquo;oi&rdquo; até o cliente confirmando o PIX — a IA
            cuida de cada passo enquanto você foca na cozinha.
          </p>
        </div>

        {/* Stats strip — restaurant-flavored numbers */}
        <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-5 sm:gap-x-14">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-2">
              <span className="font-heading text-2xl font-bold tabular-nums text-slate-900">
                {stat.value}
              </span>
              <span className="text-xs font-medium text-slate-600 sm:text-sm">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bento grid */}
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Large card #1 — Audio AI (col-span-7) */}
          <FeatureCard
            colSpan="md:col-span-7"
            eyebrow="🎙 Mensagens de áudio"
            title="A IA entende áudios, gírias e sotaques"
            description="O cliente envia o pedido falando como conversaria com qualquer atendente. A IA transcreve, interpreta o que foi pedido e confirma na hora."
            visual={<AudioVisual />}
          />

          {/* Large card #2 — PIX (col-span-5) */}
          <FeatureCard
            colSpan="md:col-span-5"
            eyebrow="PIX Automático"
            title="QR Code gerado na hora"
            description="Quando o pedido é fechado, a IA cria o PIX via Mercado Pago e confirma o pagamento em tempo real. Zero comissão por venda."
            visual={<PixVisual />}
          />

          {/* Small card — Cart */}
          <FeatureCard
            colSpan="md:col-span-4"
            title="Carrinho inteligente"
            description="Adicionar, remover, alterar — a IA gerencia o carrinho na conversa e confirma antes de fechar o pedido."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            }
          />

          {/* Small card — Address */}
          <FeatureCard
            colSpan="md:col-span-4"
            title="Endereço por CEP"
            description="Validação automática, taxa de entrega calculada e raio máximo de atendimento — tudo configurável."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            }
          />

          {/* Small card — Dashboard */}
          <FeatureCard
            colSpan="md:col-span-4"
            title="Dashboard ao vivo"
            description="Acompanhe pedidos em tempo real, veja produtos mais vendidos e receba alertas direto no painel."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Card primitive
   ───────────────────────────────────────────── */

function FeatureCard({
  colSpan,
  eyebrow,
  title,
  description,
  visual,
  icon,
}: {
  colSpan: string;
  eyebrow?: string;
  title: string;
  description: string;
  visual?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-500/10 ${colSpan}`}
    >
      {icon && (
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
          {icon}
        </div>
      )}
      {eyebrow && (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-600">
          {eyebrow}
        </p>
      )}
      <h3 className="font-heading text-xl font-semibold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      {visual && <div className="mt-6">{visual}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Visual: Audio bubble fragment
   ───────────────────────────────────────────── */

function AudioVisual() {
  const BARS = [
    4, 7, 11, 15, 19, 13, 8, 5, 9, 14, 18, 22, 17, 11, 6, 9, 13, 15, 11, 7,
    5, 8, 12, 16, 13,
  ];
  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-cyan-50/40 p-5 ring-1 ring-slate-200/60">
      {/* User audio bubble */}
      <div className="flex justify-end">
        <div className="flex max-w-[88%] items-center gap-3 rounded-2xl rounded-tr-md bg-cyan-500 px-4 py-3 shadow-md shadow-cyan-500/25">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
            <svg className="ml-0.5 h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="flex h-6 items-center gap-[2px]">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="block w-[2px] rounded-full bg-white/85"
                style={{ height: `${h}px` }}
              />
            ))}
          </span>
          <span className="text-[10px] font-medium tabular-nums text-white/90">
            0:08
          </span>
        </div>
      </div>

      {/* Bot transcription reply */}
      <div className="mt-3 flex justify-start">
        <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200/80">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-600">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Áudio entendido
          </p>
          Anotei seu pedido!{" "}
          <strong className="text-slate-900">1× Smash Duplo Bacon</strong>{" "}
          <span className="text-slate-500">— R$ 32,90</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Visual: PIX card
   ───────────────────────────────────────────── */

const QR_PATTERN: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1],
  [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1],
];

function PixVisual() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/30 p-5 ring-1 ring-slate-200/60">
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-700 ring-1 ring-emerald-500/30">
              PIX
            </span>
            <span className="text-xs font-medium text-slate-600">Pagamento</span>
          </div>
          <span className="font-heading text-lg font-bold tabular-nums text-slate-900">
            R$ 32,90
          </span>
        </div>
        {/* QR */}
        <div className="mx-auto mt-3 grid w-fit grid-cols-[repeat(17,minmax(0,1fr))] gap-px rounded-md bg-white p-2 ring-1 ring-slate-200">
          {QR_PATTERN.flatMap((row, i) =>
            row.map((cell, j) => (
              <span
                key={`${i}-${j}`}
                className={`block h-1.5 w-1.5 ${cell ? "bg-slate-900" : "bg-white"}`}
              />
            )),
          )}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium text-emerald-600">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Aguardando confirmação
        </p>
      </div>
    </div>
  );
}
