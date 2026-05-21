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

// ── Helpers ───────────────────────────────────────────────────────────

function apiBase(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;
  return fromEnv || "http://localhost:8000";
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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <HeadlineSection snapshot={snapshot} error={snapErr} />
      <MethodologySection snapshot={snapshot} />
      <ConversationsSection index={index} error={indexErr} />
    </Shell>
  );
}

function HeadlineSection({
  snapshot,
  error,
}: {
  snapshot: EvalSnapshot | null;
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
      <div className="grid animate-pulse gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100" />
        ))}
      </div>
    );

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <MetricCard
        label="Compreensão"
        value={`${snapshot.comprehension.pass_rate_pct.toFixed(1)}%`}
        sub={`${snapshot.comprehension.passed} / ${snapshot.comprehension.total} cenários`}
        highlight
      />
      <MetricCard
        label="Total de testes"
        value={snapshot.headline.total_tests.toLocaleString("pt-BR")}
        sub={`${snapshot.headline.failed} falhas · ${snapshot.headline.skipped} pulados`}
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
      />
    </section>
  );
}

function MethodologySection({
  snapshot,
}: {
  snapshot: EvalSnapshot | null;
}) {
  if (!snapshot) return null;
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
            href="/widget?slug=pizzaria-do-ze"
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
}: {
  index: IndexResponse | null;
  error: string | null;
}) {
  return (
    <section className="mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Veja na prática
          </p>
          <h2 className="font-heading mt-1 text-2xl font-semibold text-slate-900">
            Conversas recentes no demo
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Clique em uma conversa para ver intenção, ferramentas, tokens,
            custo e latência por mensagem.
          </p>
        </div>
        <a
          href="/widget?slug=pizzaria-do-ze"
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
      {index && index.conversations.length === 0 && <EmptyIndex />}
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

function EmptyIndex() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <p className="text-sm font-semibold text-slate-700">
        Sem conversas no demo ainda.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Abra o widget e mande algumas mensagens — depois recarregue esta página.
      </p>
      <a
        href="/widget?slug=pizzaria-do-ze"
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
  highlight = false,
  mono = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 font-heading font-semibold ${
          highlight ? "text-amber-700" : "text-slate-900"
        } ${mono ? "font-mono text-xl" : "text-4xl"} tabular-nums`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
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
