/**
 * Public behind-the-scenes conversation trace viewer.
 *
 * P4-public of plan/portfolio_pivot.md. Lives in the (landing) route
 * group — no login required. Scoped server-side to the seeded demo
 * restaurant (slug "pizzaria-do-ze"); pasting any other bot's
 * contact_id returns 404 from the backend.
 *
 * Two modes, same page:
 *
 *   /trace                       → index: cards of recent demo conversations
 *   /trace?contact_id=<id>       → detail: full per-message trace
 *
 * Recruiters land at /trace, see a list of real conversations on the
 * demo bot, click one to see the AI engineering work behind each
 * customer message — intent class, tools called, tokens (input/output/
 * cached), USD cost, latency.
 *
 * Backed by:
 *   GET /public/trace/demo/conversations
 *   GET /public/trace/demo/conversations/{contact_id}
 *
 * Uses plain fetch (no JWT) because the surface is public. Falls back
 * to a friendly empty state when the demo hasn't been chatted with yet.
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

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
  totals: {
    cost_usd: number;
    duration_ms: number;
    tokens: number;
  };
}

interface IndexResponse {
  bot_id: number;
  bot_slug: string;
  conversations: ConversationSummary[];
}

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

export default function TracePage() {
  return (
    <Suspense fallback={<Shell><Skeleton /></Shell>}>
      <TracePageInner />
    </Suspense>
  );
}

function TracePageInner() {
  const params = useSearchParams();
  const contactId = params.get("contact_id");
  return contactId ? <DetailView contactId={contactId} /> : <IndexView />;
}

// ─────────────────────────────────────────────────────────────────────
// Index — list of recent demo conversations
// ─────────────────────────────────────────────────────────────────────

function IndexView() {
  const [data, setData] = useState<IndexResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase()}/public/trace/demo/conversations`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<IndexResponse>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled)
          setError("Não foi possível carregar as conversas do demo agora.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data && !error) return <Shell><Skeleton /></Shell>;
  if (error)
    return (
      <Shell>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {error}
        </div>
      </Shell>
    );
  if (!data) return null;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-slate-900">
            Conversas recentes no demo
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada cartão é uma conversa real no bot demo. Clique para ver a
            intenção, ferramentas, tokens, custo e latência por mensagem.
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

      {data.conversations.length === 0 ? (
        <EmptyIndex />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.conversations.map((c) => (
            <ConversationCard key={c.contact_id} c={c} />
          ))}
        </ul>
      )}
    </Shell>
  );
}

function ConversationCard({ c }: { c: ConversationSummary }) {
  const when = c.last_at ? new Date(c.last_at) : null;
  return (
    <li>
      <a
        href={`/trace?contact_id=${c.contact_id}`}
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
          {c.preview ? `“${c.preview}”` : "(sem prévia)"}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Mini label="Msgs" value={c.message_count.toString()} />
          <Mini label="Tokens" value={c.totals.tokens.toLocaleString("pt-BR")} />
          <Mini label="Custo" value={fmtCost(c.totals.cost_usd)} />
        </div>
        <p className="mt-3 text-[11px] font-medium text-amber-700 group-hover:text-amber-800">
          Ver telemetria →
        </p>
      </a>
    </li>
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

function EmptyIndex() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <p className="text-sm font-semibold text-slate-700">
        Sem conversas no demo ainda.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Abra o widget de demo e mande algumas mensagens — depois recarregue
        esta página.
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

// ─────────────────────────────────────────────────────────────────────
// Detail — full trace for one conversation
// ─────────────────────────────────────────────────────────────────────

function DetailView({ contactId }: { contactId: string }) {
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
        // Network error fallback — only set if no HTTP error already set.
        if (!cancelled) {
          setError((prev) => prev ?? { status: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (error) return <Shell><DetailError status={error.status} /></Shell>;
  if (!data) return <Shell><Skeleton /></Shell>;

  return (
    <Shell>
      <BackToIndex />
      <Header2
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

function BackToIndex() {
  return (
    <a
      href="/trace"
      className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-amber-700"
    >
      ← Todas as conversas
    </a>
  );
}

function Header2({
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
      <Card label="Identidade" value={identity} sub={channel ?? "web"} mono />
      <Card label="Mensagens" value={messageCount.toString()} sub="visíveis" />
      <Card
        label="Custo total"
        value={totals ? fmtCost(totals.cost_usd) : "—"}
        sub={
          totals
            ? `${totals.tokens.input + totals.tokens.output} tokens`
            : "sem dados"
        }
      />
      <Card
        label="Latência total"
        value={totals ? fmtMs(totals.duration_ms) : "—"}
        sub={totals ? `${totals.operations.length} ops` : "sem dados"}
      />
    </section>
  );
}

function Card({
  label,
  value,
  sub,
  mono = false,
}: {
  label: string;
  value: string;
  sub: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-heading text-2xl font-semibold tabular-nums text-slate-900 ${
          mono ? "font-mono text-lg" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
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
                <Stat label="Latência" value={fmtMs(message.trace.duration_ms)} />
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

function DetailError({ status }: { status: number | null }) {
  if (status === 404) {
    return (
      <>
        <BackToIndex />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Conversa não encontrada (ou não pertence ao bot demo).
        </div>
      </>
    );
  }
  return (
    <>
      <BackToIndex />
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Erro ao carregar a conversa. Tente novamente em instantes.
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shell / loading
// ─────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 pt-28 pb-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          AI engineering · Trace
        </p>
        <h1 className="font-heading mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">
          Por trás da conversa
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
          Cada mensagem do cliente vem com a intenção classificada, as
          ferramentas chamadas, tokens, custo em USD e latência. Tudo
          medido em produção, nada de pôster motivacional.
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
