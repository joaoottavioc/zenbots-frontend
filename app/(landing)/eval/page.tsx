/**
 * Public eval + trace page — merged P4/P5 of plan/portfolio_pivot.md.
 *
 * One narrative, two views:
 *
 *   /eval                       → overview
 *     - Headline corpus QA metrics (comprehension %, total tests, ...)
 *     - Methodology card (harness, what we measure / don't measure)
 *     - Gallery of recent demo conversations (cards, click to drill in)
 *
 *   /eval?contact_id=<id>       → detail
 *     - Back-link to overview
 *     - Per-conversation identity + cost + latency totals
 *     - Per-message trace rows (intent / tools / tokens / cost / latency)
 *
 * The merge replaces the previous /eval + /trace pages. Rationale: the
 * two views tell the same story — aggregate eval rigor at the top, real
 * conversations as proof at the bottom. Fewer URLs to share with
 * recruiters, one screenshot covers the AI engineering posture.
 *
 * Backed by:
 *   GET /public/eval/latest                                 (snapshot)
 *   GET /public/trace/demo/conversations                    (index)
 *   GET /public/trace/demo/conversations/{contact_id}       (detail)
 *
 * Plain fetch, no auth — surface is intentionally public. Web identities
 * are anonymized server-side ("web:abc123" instead of full UUID).
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

// ── Eval snapshot types ───────────────────────────────────────────────

interface EvalSnapshot {
  schema_version: string;
  generated_at: string;
  headline: {
    total_tests: number;
    passed: number;
    failed: number;
    skipped: number;
    pass_rate_pct: number;
  };
  comprehension: {
    total: number;
    passed: number;
    failed: number;
    pass_rate_pct: number;
  };
  consistency: {
    worst_restaurant_pct: number | null;
    cross_restaurant_spread_pp: number | null;
  };
  methodology: {
    harness: string;
    corpus_size: number | null;
    samples_per_restaurant: number | null;
    description: string;
    repo_link: string;
  };
}

// ── Trace types ───────────────────────────────────────────────────────

interface TraceOperation {
  service: string;
  operation: string;
  model: string | null;
  tokens: { input: number; output: number; cached: number };
  cost_usd: number;
  duration_ms: number;
  success: boolean;
  channel: string | null;
}

interface TraceSummary {
  tokens: { input: number; output: number; cached: number };
  cost_usd: number;
  duration_ms: number;
  operations: TraceOperation[];
}

interface TraceMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string | null;
  trace_id: string | null;
  trace: TraceSummary | null;
}

interface ConversationDetail {
  bot_id: number;
  bot_slug: string;
  contact_id: number;
  identity: string;
  channel: string | null;
  messages: TraceMessage[];
  totals: TraceSummary | null;
}

interface ConversationSummary {
  contact_id: number;
  identity: string;
  channel: string | null;
  message_count: number;
  preview: string;
  started_at: string | null;
  last_at: string | null;
  totals: { cost_usd: number; duration_ms: number; tokens: number };
}

interface IndexResponse {
  bot_id: number;
  bot_slug: string;
  conversations: ConversationSummary[];
}

interface MenuProduct {
  name: string;
  price: number;
  description: string;
}

interface MenuCategory {
  name: string;
  products: MenuProduct[];
}

interface MenuResponse {
  bot_slug: string;
  restaurant_name: string;
  categories: MenuCategory[];
  total_products: number;
}

interface RouterSavings {
  window_days: number;
  total_messages: number;
  router_only_messages: number;
  with_llm_messages: number;
  router_only_pct: number;
}

// ── Helpers ───────────────────────────────────────────────────────────

function apiBase(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;
  return fromEnv || "http://localhost:8000";
}

// Href to the live demo widget. With a known slug we deep-link
// same-origin (fast nav). Without one (menu fetch failed / cold start)
// we hand off to the backend /demo redirect, which resolves the demo
// bot's *current* slug server-side — so the button is never a dead link,
// even right after a dashboard rename. (Previously fell back to a
// hardcoded "pizzaria-do-ze", which broke when the bot was renamed.)
function demoWidgetHref(slug: string | null | undefined): string {
  return slug
    ? `/widget?slug=${encodeURIComponent(slug)}`
    : `${apiBase()}/demo`;
}

const fmtCost = (n: number) =>
  n < 0.0001 ? "<$0.0001" : `$${n.toFixed(4)}`;
const fmtMs = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`;

// ── Page shell ────────────────────────────────────────────────────────

export default function EvalPage() {
  return (
    <Suspense fallback={<Shell><Skeleton /></Shell>}>
      <EvalPageInner />
    </Suspense>
  );
}

function EvalPageInner() {
  const params = useSearchParams();
  const contactId = params.get("contact_id");
  return contactId ? <DetailMode contactId={contactId} /> : <OverviewMode />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 pt-28 pb-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          AI engineering · Eval + telemetria
        </p>
        <h1 className="font-heading mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">
          Compreensão medida, conversa por conversa
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
          A pontuação agregada no topo, as conversas reais embaixo. Cada
          mensagem traz a intenção classificada, ferramentas, tokens, custo
          em USD e latência. Tudo medido em produção.
        </p>
        <div className="mt-8">{children}</div>
      </main>
      <Footer />
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

// ── Overview mode (default) ───────────────────────────────────────────

function OverviewMode() {
  const [snapshot, setSnapshot] = useState<EvalSnapshot | null>(null);
  const [snapErr, setSnapErr] = useState<string | null>(null);
  const [index, setIndex] = useState<IndexResponse | null>(null);
  const [indexErr, setIndexErr] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [savings, setSavings] = useState<RouterSavings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase()}/public/eval/latest`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EvalSnapshot>;
      })
      .then((d) => {
        if (!cancelled) setSnapshot(d);
      })
      .catch(() => {
        if (!cancelled) setSnapErr("Snapshot indisponível agora.");
      });
    fetch(`${apiBase()}/public/trace/demo/conversations`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<IndexResponse>;
      })
      .then((d) => {
        if (!cancelled) setIndex(d);
      })
      .catch(() => {
        if (!cancelled) setIndexErr("Conversas do demo indisponíveis agora.");
      });
    fetch(`${apiBase()}/public/demo/menu`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MenuResponse>;
      })
      .then((d) => {
        if (!cancelled) setMenu(d);
      })
      .catch(() => {
        // Non-fatal: the menu is a nice-to-have. The rest of the page
        // works without it.
      });
    fetch(`${apiBase()}/public/eval/router-savings`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<RouterSavings>;
      })
      .then((d) => {
        if (!cancelled) setSavings(d);
      })
      .catch(() => {
        // Also non-fatal — the 4th headline card just doesn't render.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <HeadlineSection
        snapshot={snapshot}
        savings={savings}
        error={snapErr}
      />
      <HowToTestSection menu={menu} />
      <MenuSection menu={menu} />
      <SuggestedPromptsSection menu={menu} />
      <MethodologySection snapshot={snapshot} menu={menu} />
      <ConversationsSection index={index} error={indexErr} menu={menu} />
      <AccessRequestSection />
      <ReadingGuideSection />
    </Shell>
  );
}

function HeadlineSection({
  snapshot,
  savings,
  error,
}: {
  snapshot: EvalSnapshot | null;
  savings: RouterSavings | null;
  error: string | null;
}) {
  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {error}
      </div>
    );
  if (!snapshot)
    return (
      <div className="grid animate-pulse gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100" />
        ))}
      </div>
    );

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Compreensão"
        value={`${snapshot.comprehension.pass_rate_pct.toFixed(1)}%`}
        sub={`${snapshot.comprehension.passed} / ${snapshot.comprehension.total} cenários`}
        hint="Cada cenário do corpus é considerado entendido se o bot interpretou a intenção do cliente e produziu o estado de carrinho correto. 'No crash' não conta."
        highlight
      />
      <MetricCard
        label="Total de testes"
        value={snapshot.headline.total_tests.toLocaleString("pt-BR")}
        sub={`${snapshot.headline.failed} falhas · ${snapshot.headline.skipped} pulados`}
        hint="Suíte completa do corpus: combinações de adicionar/remover/modificar itens, fluxos ambíguos e cenários de checkout em vários restaurantes."
      />
      <MetricCard
        label="Restaurantes no corpus"
        value={
          snapshot.methodology.corpus_size?.toLocaleString("pt-BR") ?? "—"
        }
        sub={
          snapshot.methodology.samples_per_restaurant
            ? `${snapshot.methodology.samples_per_restaurant} amostras cada`
            : "amostras variáveis"
        }
        hint="Menus reais extraídos de fontes públicas. Testa consistência entre restaurantes — não só um caminho feliz."
      />
      <MetricCard
        label="Sem LLM (router)"
        value={savings ? `${savings.router_only_pct.toFixed(0)}%` : "—"}
        sub={
          savings
            ? `${savings.router_only_messages} / ${savings.total_messages} msgs em ${savings.window_days}d`
            : "30d demo"
        }
        hint="Mensagens classificadas só pelo router de embeddings, sem invocar LLM. Cada chamada economizada é ~$0.0006 que não foi gasto."
      />
    </section>
  );
}

function MethodologySection({
  snapshot,
  menu,
}: {
  snapshot: EvalSnapshot | null;
  menu: MenuResponse | null;
}) {
  if (!snapshot) return null;
  // Slug for the "Testar o bot agora" button — uses the live demo slug
  // from the menu API so a rename in the dashboard propagates here; when
  // it hasn't loaded, demoWidgetHref falls back to the /demo redirect.
  const slug = menu?.bot_slug ?? null;
  const generated = new Date(snapshot.generated_at);
  const generatedLabel = generated.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          Metodologia
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {snapshot.methodology.description}
        </p>
        <dl className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <DetailRow label="Harness" value={snapshot.methodology.harness} mono />
          <DetailRow label="Schema" value={`v${snapshot.schema_version}`} mono />
          <DetailRow label="Última execução" value={generatedLabel} />
          {snapshot.consistency.worst_restaurant_pct !== null && (
            <DetailRow
              label="Pior restaurante"
              value={`${snapshot.consistency.worst_restaurant_pct.toFixed(1)}%`}
            />
          )}
        </dl>
        <p className="mt-6 text-xs text-slate-500">
          O snapshot é versionado em{" "}
          <code className="rounded bg-slate-200 px-1 font-mono">
            eval/latest.json
          </code>{" "}
          do repositório — cada commit é uma medição histórica.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={snapshot.methodology.repo_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Ver código do harness →
          </a>
          <a
            href={demoWidgetHref(slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Testar o bot agora
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-emerald-700">O que isso mede</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Intenção (adicionar, remover, modificar, sugerir, fechar).</li>
            <li>• Estado final do carrinho após a interação.</li>
            <li>• Quantidades, modificadores e ambiguidades.</li>
            <li>• Consistência entre restaurantes diferentes.</li>
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold text-amber-700">O que não mede</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Latência por mensagem (visível por conversa abaixo).</li>
            <li>• Qualidade subjetiva da resposta — só correção funcional.</li>
            <li>• Cenários de áudio (eval de voz é separado).</li>
          </ul>
        </Card>
      </section>
    </>
  );
}

function ConversationsSection({
  index,
  error,
  menu,
}: {
  index: IndexResponse | null;
  error: string | null;
  menu: MenuResponse | null;
}) {
  const slug = menu?.bot_slug ?? index?.bot_slug ?? null;
  return (
    <section className="mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Veja na prática
          </p>
          <h2 className="font-heading mt-1 text-2xl font-semibold text-slate-900">
            Conversas recentes
            {menu?.restaurant_name ? ` · ${menu.restaurant_name}` : ""}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Clique em uma conversa para ver intenção, ferramentas, tokens,
            custo e latência por mensagem.
          </p>
        </div>
        <a
          href={demoWidgetHref(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          Adicionar uma conversa →
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {!index && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      )}
      {index && index.conversations.length === 0 && <EmptyIndex slug={slug} />}
      {index && index.conversations.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {index.conversations.map((c) => (
            <ConversationCard key={c.contact_id} c={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ConversationCard({ c }: { c: ConversationSummary }) {
  const when = c.last_at ? new Date(c.last_at) : null;
  return (
    <li>
      <a
        href={`/eval?contact_id=${c.contact_id}`}
        className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
              {c.identity}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {when
                ? when.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
            {c.channel ?? "web"}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm italic text-slate-800">
          {c.preview ? `"${c.preview}"` : "(sem prévia)"}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Mini label="Msgs" value={c.message_count.toString()} />
          <Mini
            label="Tokens"
            value={c.totals.tokens.toLocaleString("pt-BR")}
          />
          <Mini label="Custo" value={fmtCost(c.totals.cost_usd)} />
        </div>
        <p className="mt-3 text-[11px] font-medium text-amber-700 group-hover:text-amber-800">
          Ver telemetria →
        </p>
      </a>
    </li>
  );
}

function EmptyIndex({ slug }: { slug: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <p className="text-sm font-semibold text-slate-700">
        Sem conversas no demo ainda.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Abra o widget e mande algumas mensagens — depois recarregue esta página.
      </p>
      <a
        href={demoWidgetHref(slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
      >
        Abrir o demo →
      </a>
    </div>
  );
}

// ── Detail mode (?contact_id=X) ───────────────────────────────────────

function DetailMode({ contactId }: { contactId: string }) {
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<{ status: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase()}/public/trace/demo/conversations/${contactId}`)
      .then(async (r) => {
        if (!r.ok) {
          if (!cancelled) setError({ status: r.status });
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json() as Promise<ConversationDetail>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError((prev) => prev ?? { status: null });
      });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (error)
    return (
      <Shell>
        <BackToOverview />
        <DetailError status={error.status} />
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <BackToOverview />
        <Skeleton />
      </Shell>
    );

  return (
    <Shell>
      <BackToOverview />
      <DetailHeader
        identity={data.identity}
        channel={data.channel}
        messageCount={data.messages.length}
        totals={data.totals}
      />
      <ul className="mt-6 space-y-3">
        {data.messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
        {data.messages.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Sem mensagens nesta conversa.
          </li>
        )}
      </ul>
    </Shell>
  );
}

function BackToOverview() {
  return (
    <a
      href="/eval"
      className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-amber-700"
    >
      ← Voltar para o eval
    </a>
  );
}

function DetailHeader({
  identity,
  channel,
  messageCount,
  totals,
}: {
  identity: string;
  channel: string | null;
  messageCount: number;
  totals: TraceSummary | null;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-4">
      <MetricCard
        label="Identidade"
        value={identity}
        sub={channel ?? "web"}
        mono
      />
      <MetricCard
        label="Mensagens"
        value={messageCount.toString()}
        sub="visíveis"
      />
      <MetricCard
        label="Custo total"
        value={totals ? fmtCost(totals.cost_usd) : "—"}
        sub={
          totals
            ? `${totals.tokens.input + totals.tokens.output} tokens`
            : "sem dados"
        }
      />
      <MetricCard
        label="Latência total"
        value={totals ? fmtMs(totals.duration_ms) : "—"}
        sub={totals ? `${totals.operations.length} ops` : "sem dados"}
      />
    </section>
  );
}

function MessageRow({ message }: { message: TraceMessage }) {
  const isUser = message.role === "user";
  return (
    <li className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
        <div className="sm:w-24 shrink-0">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isUser
                ? "bg-blue-50 text-blue-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isUser ? "Cliente" : "Bot"}
          </span>
          <p className="mt-1 text-[10px] text-slate-400">
            {message.created_at
              ? new Date(message.created_at).toLocaleTimeString("pt-BR")
              : ""}
          </p>
        </div>
        <div className="flex-1">
          <p className="whitespace-pre-wrap text-sm text-slate-800">
            {message.content}
          </p>
          {message.trace && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                <Stat label="Custo" value={fmtCost(message.trace.cost_usd)} />
                <Stat
                  label="Tokens"
                  value={`${message.trace.tokens.input}↓ / ${message.trace.tokens.output}↑`}
                />
                <Stat
                  label="Latência"
                  value={fmtMs(message.trace.duration_ms)}
                />
              </div>
              {message.trace.operations.length > 0 && (
                <details className="mt-3" open>
                  <summary className="cursor-pointer text-xs font-medium text-amber-800 hover:text-amber-900">
                    {message.trace.operations.length} chamada(s) externa(s)
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {message.trace.operations.map((op, i) => (
                      <OperationRow key={i} op={op} />
                    ))}
                  </ul>
                </details>
              )}
              {message.trace_id && (
                <p className="mt-2 font-mono text-[10px] text-slate-500">
                  trace_id = {message.trace_id}
                </p>
              )}
            </div>
          )}
          {!message.trace && isUser && (
            <p className="mt-2 text-[11px] italic text-slate-400">
              {message.trace_id
                ? "Sem dados de telemetria para esta mensagem."
                : "Mensagem anterior à instrumentação — sem trace."}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function OperationRow({ op }: { op: TraceOperation }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-white px-2 py-1.5 text-[11px]">
      <span className="font-mono font-medium text-slate-800">
        {op.service}/{op.operation}
      </span>
      {op.model && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
          {op.model}
        </span>
      )}
      <span className="text-slate-500">
        {op.tokens.input}↓ / {op.tokens.output}↑
        {op.tokens.cached > 0 && ` · ${op.tokens.cached} cache`}
      </span>
      <span className="tabular-nums text-slate-500">
        ${op.cost_usd.toFixed(6)}
      </span>
      <span className="tabular-nums text-slate-500">{op.duration_ms}ms</span>
      {!op.success && (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
          falhou
        </span>
      )}
    </li>
  );
}

function DetailError({ status }: { status: number | null }) {
  if (status === 404) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Conversa não encontrada (ou não pertence ao bot demo).
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      Erro ao carregar a conversa. Tente novamente em instantes.
    </div>
  );
}

// ── Atoms ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  hint,
  highlight = false,
  mono = false,
}: {
  label: string;
  value: string;
  sub: string;
  hint?: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-2xl border p-6 ${
        highlight
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {hint && (
          // Native `title` tooltip for hover; the body text below renders
          // a small italic hint that's always visible too — recruiters
          // skim, not hover.
          <span
            className="cursor-help text-[10px] text-slate-400"
            title={hint}
            aria-label={hint}
          >
            ⓘ
          </span>
        )}
      </div>
      <p
        className={`mt-2 font-heading font-semibold ${
          highlight ? "text-amber-700" : "text-slate-900"
        } ${mono ? "font-mono text-xl" : "text-4xl"} tabular-nums`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
      {hint && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"} text-slate-800`}
      >
        {value}
      </dd>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {children}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-amber-700/80">
        {label}
      </p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Recruiter-first sections
//
// These sit between the headline metrics and the methodology block.
// Goal: a non-engineer should be able to test the demo and form a
// hire opinion in <60 seconds. The friction loop used to be: read
// metrics → scroll to empty gallery → guess what to type → wander
// the widget. Now: read metrics → see the menu → click a suggested
// prompt → trace appears.
// ─────────────────────────────────────────────────────────────────────

function HowToTestSection({ menu }: { menu: MenuResponse | null }) {
  // Slug + restaurant name come from the menu endpoint so the widget link
  // and the visible copy follow whatever the demo bot is currently named.
  // If the menu hasn't loaded yet, demoWidgetHref falls back to the
  // backend /demo redirect (never a dead link).
  const slug = menu?.bot_slug ?? null;
  const restaurantName = menu?.restaurant_name ?? "demo";

  const steps: { n: number; title: string; body: string }[] = [
    {
      n: 1,
      title: "Olhe o cardápio",
      body: `Lista do que o ${restaurantName} aceita pedir. Logo abaixo, com preços.`,
    },
    {
      n: 2,
      title: "Abra o widget",
      body: "Botão no canto inferior direito quando aberto. Mande mensagens como faria pelo WhatsApp.",
    },
    {
      n: 3,
      title: "Veja a telemetria",
      body: "Volte aqui e recarregue. Sua conversa aparece logo abaixo — clique para ver intenção, ferramentas, tokens, custo.",
    },
  ];
  return (
    <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/40 p-6 sm:p-8">
      <h2 className="font-heading text-xl font-semibold text-slate-900">
        Como testar em 60 segundos
      </h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="rounded-xl border border-amber-100 bg-white p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
              {s.n}
            </div>
            <p className="mt-3 font-semibold text-slate-900">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={demoWidgetHref(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          Abrir o widget agora →
        </a>
      </div>
    </section>
  );
}

function MenuSection({ menu }: { menu: MenuResponse | null }) {
  const [open, setOpen] = useState(true);
  if (!menu) {
    return (
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          Cardápio
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Carregando produtos...
        </p>
      </section>
    );
  }
  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Cardápio · {menu.restaurant_name}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {menu.total_products} itens em {menu.categories.length} categorias.
            Use os nomes abaixo quando conversar com o bot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-slate-600 hover:text-amber-700"
        >
          {open ? "Esconder ▲" : "Mostrar ▼"}
        </button>
      </div>
      {open && (
        <div className="mt-5 space-y-5">
          {menu.categories.map((cat) => (
            <div key={cat.name}>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                {cat.name}
              </p>
              <ul className="mt-2 divide-y divide-slate-100">
                {cat.products.map((p) => (
                  <li
                    key={p.name}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-500">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-800">
                      R$ {p.price.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface SuggestedPrompt {
  label: string;
  text: string;
  expected: string;
  intent: string;
}

// Fallback prompts used only when the menu endpoint hasn't loaded yet.
// The real prompts are generated from the live menu (see buildPrompts
// below) so a bot rename / menu edit on the dashboard reflows the
// suggestions automatically.
const FALLBACK_PROMPTS: SuggestedPrompt[] = [
  {
    label: "Pedido simples",
    text: "quero um item do cardápio",
    expected: "Router classifica como ADD com alta confiança. Sem LLM.",
    intent: "ADD",
  },
];

/** Detect which category looks like "drinks" so we can compose a
 *  realistic "main + drink" multi-item prompt. Falls back to the second
 *  category in declaration order when no match exists. */
function findCategory(
  menu: MenuResponse,
  patterns: RegExp[],
): MenuCategory | undefined {
  for (const re of patterns) {
    const hit = menu.categories.find((c) => re.test(c.name));
    if (hit && hit.products.length > 0) return hit;
  }
  return undefined;
}

/** Generate menu-aware suggested prompts. Each one exercises a
 *  different pipeline path. Falls back to a single generic prompt if
 *  the menu is empty.
 *
 *  Design: prompt TEXT is dynamic (uses real product names) but the
 *  expected-pipeline EXPLANATION is fixed because the pipeline behavior
 *  doesn't depend on the bot's menu — only on the user's wording. */
function buildPrompts(menu: MenuResponse | null): SuggestedPrompt[] {
  if (!menu || menu.categories.length === 0) return FALLBACK_PROMPTS;

  // Main = first category that's not drinks/desserts/sides. Most bots
  // sort their primary category first, but if it happens to be drinks
  // we fall back to scanning.
  const sidePatterns = [
    /bebida|drink|refri/i,
    /sobremesa|dessert|doce/i,
    /acompanhamento|extras|adicio/i,
  ];
  const isSide = (c: MenuCategory) => sidePatterns.some((re) => re.test(c.name));
  const mainCategory =
    menu.categories.find((c) => c.products.length > 0 && !isSide(c)) ??
    menu.categories[0];
  const drinkCategory = findCategory(menu, [/bebida|drink|refri/i]);

  const main1 = mainCategory.products[0]?.name ?? "item";
  const main2 = mainCategory.products[1]?.name ?? main1;
  const drink = drinkCategory?.products[0]?.name ?? main2;
  const sideCat = menu.categories.find(isSide);
  const sideCategoryName = sideCat?.name.toLowerCase() ?? "bebida";

  const lc = (s: string) => s.toLowerCase();

  return [
    {
      label: "Pedido simples",
      text: `quero um(a) ${lc(main1)}`,
      expected: "Router classifica como ADD com alta confiança. Sem LLM.",
      intent: "ADD",
    },
    {
      label: "Quantidade múltipla",
      text: `manda 2 ${lc(drink)} e um(a) ${lc(main2)}`,
      expected:
        "Router → ADD. Extração de itens pode chamar LLM se houver ambiguidade.",
      intent: "ADD (multi)",
    },
    {
      label: "Remover",
      text: `pode tirar o(a) ${lc(main1)}`,
      expected:
        "Router classifica como REMOVE. Mutação determinística do carrinho.",
      intent: "REMOVE",
    },
    {
      label: "Sugestão",
      text: `o que vocês têm de ${sideCategoryName}?`,
      expected:
        "Router → REQUEST_SUGGESTION. Resposta gerada pelo LLM com contexto do menu.",
      intent: "SUGGEST",
    },
    {
      label: "Pergunta ambígua",
      text: "qual o item mais pedido?",
      expected:
        "Router não classifica com confiança → LLM tool calling decide a resposta. Veja o custo.",
      intent: "QUESTION",
    },
  ];
}

function SuggestedPromptsSection({ menu }: { menu: MenuResponse | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const slug = menu?.bot_slug ?? null;
  const prompts = buildPrompts(menu);
  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Sugestões para testar
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada exemplo exercita um caminho diferente do pipeline. Copie e cole
            no widget para ver a telemetria correspondente.
          </p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {prompts.map((p) => (
          <li
            key={p.text}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                {p.label}
              </span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-700">
                {p.intent}
              </span>
            </div>
            <p className="mt-3 font-mono text-sm text-slate-900">
              &ldquo;{p.text}&rdquo;
            </p>
            <p className="mt-2 text-xs italic text-slate-500">
              {p.expected}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(p.text);
                  setCopied(p.text);
                  setTimeout(() => setCopied(null), 1500);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {copied === p.text ? "✓ Copiado" : "📋 Copiar"}
              </button>
              <a
                href={demoWidgetHref(slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-amber-700"
              >
                Abrir widget →
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccessRequestSection() {
  // Pre-filled subject lets João bucket "recruiter wants access" emails
  // separately from general inbox. Body left blank so the recruiter writes
  // their own ask.
  const subject = encodeURIComponent("Acesso ao dashboard do ZenBotZ");
  const body = encodeURIComponent(
    "Olá João,\n\n" +
      "Cheguei no /eval do seu portfólio e queria explorar o lado do dono " +
      "(criação de bot, fluxo de pedidos, upload de cardápio). Pode me " +
      "compartilhar acesso?\n\n" +
      "— [seu nome / empresa / papel]\n",
  );
  const mailto = `mailto:joaoottavioc@gmail.com?subject=${subject}&body=${body}`;
  return (
    <section className="mt-10 rounded-2xl border border-slate-900 bg-slate-900 p-6 text-white sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
        Quer ver o lado do dono?
      </p>
      <h2 className="font-heading mt-2 text-2xl font-semibold">
        Acesso ao dashboard de criação de bots
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
        O dashboard do restaurante está atrás de auth e inclui: criação de
        bot, upload de cardápio por PDF/imagem (extração via gpt-4o),
        kitchen-display em tempo real (SSE), painel de custos por bot,
        e configuração do widget. Mando credenciais sob demanda para
        recruiters / engineering managers avaliando o portfólio — basta
        mandar um email.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={mailto}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
        >
          📧 Pedir acesso
        </a>
        <a
          href="https://www.linkedin.com/in/joaoribeiroc/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          {/* Inline SVG instead of icon dep — same posture as the GitHub
              button next to it; keeps the widget bundle lean. */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          LinkedIn
        </a>
        <a
          href="https://github.com/joaoottavioc"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          GitHub
        </a>
        <span className="text-xs text-slate-400">
          ou direto:{" "}
          <a
            href="mailto:joaoottavioc@gmail.com"
            className="font-mono text-slate-300 underline-offset-2 hover:text-amber-400 hover:underline"
          >
            joaoottavioc@gmail.com
          </a>
        </span>
      </div>
    </section>
  );
}

function ReadingGuideSection() {
  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
      <h2 className="font-heading text-lg font-semibold text-slate-900">
        Como ler a telemetria
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Cada mensagem do cliente passa por uma cadeia de operações instrumentadas.
        Os ícones abaixo aparecem nos cards de cada conversa:
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <GuideRow
          label="semantic_router/classify_intent"
          desc="Classificador local de intenção (embeddings, sem LLM). Mais barato e mais rápido. Custo $0, ~10-15ms."
        />
        <GuideRow
          label="openai/get_ai_decision"
          desc="Chamada gpt-4o-mini para tool calling. Dispara quando o router não tem confiança suficiente. ~3500↓/150↑ tokens, ~$0.0006."
        />
        <GuideRow
          label="openai/extract_potential_items"
          desc="Extração estruturada de produtos quando a fala do cliente lista vários itens. Roda com gpt-4o-mini em JSON mode."
        />
        <GuideRow
          label="openai/transcribe_audio"
          desc="Whisper (Groq primário, OpenAI fallback) para áudios. Trace de voz é separado do trace de texto."
        />
        <GuideRow
          label="↓ tokens / ↑ tokens"
          desc="Entrada (prompt + contexto) versus saída (resposta gerada). Custos OpenAI são por token de cada tipo."
        />
        <GuideRow
          label="c=0.87"
          desc="Confiança do router. Acima do threshold (varia por intenção), a classificação é aceita; abaixo, o LLM assume."
        />
      </dl>
    </section>
  );
}

function GuideRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div>
      <p className="font-mono text-xs font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}
