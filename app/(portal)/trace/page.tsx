/**
 * Behind-the-scenes conversation trace viewer.
 *
 * P4 of plan/portfolio_pivot.md. Owner-only page that shows, per
 * customer message:
 *
 *   - The user message + bot reply (content)
 *   - Intent / tool calls / token counts / cost / latency that produced it
 *
 * Why: most "AI engineer" portfolios end at "uses OpenAI API". This page
 * is the screenshot that proves the codebase tracks the real production
 * concerns — what the model decided, what it cost, how long it took.
 *
 * URL: /trace?bot_id=X&contact_id=Y
 * (Query-param form because the (portal) route group is statically
 * exported; dynamic `[botId]/[contactId]` segments aren't compatible
 * with `output: "export"` in Next.js. CloudFront rewrite from a prettier
 * URL is possible later.)
 *
 * The fetch is authenticated by the existing `api` axios client (JWT
 * cookie). Backend enforces ownership before returning data.
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

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

interface TraceResponse {
  bot_id: number;
  contact_id: number;
  messages: TraceMessage[];
  totals: TraceSummary | null;
}

export default function TracePage() {
  return (
    <Suspense
      fallback={<Shell><Skeleton /></Shell>}
    >
      <TracePageInner />
    </Suspense>
  );
}

function TracePageInner() {
  const params = useSearchParams();
  const botId = params.get("bot_id");
  const contactId = params.get("contact_id");

  if (!botId || !contactId) {
    return (
      <Shell>
        <ParamHelp />
      </Shell>
    );
  }

  return <TraceLoaded botId={botId} contactId={contactId} />;
}

function TraceLoaded({ botId, contactId }: { botId: string; contactId: string }) {
  const { data, isLoading, isError, error } = useQuery<TraceResponse>({
    queryKey: ["conversation-trace", botId, contactId],
    queryFn: async () => {
      const res = await api.get(
        `/bots/${botId}/conversations/${contactId}/trace`,
      );
      return res.data;
    },
    retry: false,
  });

  if (isLoading) return <Shell><Skeleton /></Shell>;

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    return (
      <Shell>
        <ErrorState status={status ?? null} />
      </Shell>
    );
  }

  if (!data) return null;

  return (
    <Shell>
      <Header
        botId={data.bot_id}
        contactId={data.contact_id}
        messageCount={data.messages.length}
        totals={data.totals}
      />
      <ul className="mt-8 space-y-3">
        {data.messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
        {data.messages.length === 0 && <EmptyState />}
      </ul>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
        AI engineering · Trace
      </p>
      <h1 className="font-heading mt-1 text-3xl font-semibold text-slate-900">
        Por trás da conversa
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Cada mensagem do cliente aparece com a intenção classificada, as
        ferramentas chamadas, tokens, custo e latência.
      </p>
      {children}
    </div>
  );
}

function Header({
  botId,
  contactId,
  messageCount,
  totals,
}: {
  botId: number;
  contactId: number;
  messageCount: number;
  totals: TraceSummary | null;
}) {
  const fmtCost = (n: number) => `$${n.toFixed(4)}`;
  const fmtMs = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`;
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-4">
      <Card label="Bot" value={`#${botId}`} sub={`Contato #${contactId}`} />
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
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function MessageRow({ message }: { message: TraceMessage }) {
  const isUser = message.role === "user";
  const fmtCost = (n: number) =>
    n < 0.0001 ? `<$0.0001` : `$${n.toFixed(4)}`;
  const fmtMs = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`;
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
          {/* Trace block lives below the user message — represents the
              work to process it. Bot replies are the OUTPUT of that
              work and intentionally don't get their own trace. */}
          {message.trace && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                <Stat
                  label="Custo"
                  value={fmtCost(message.trace.cost_usd)}
                />
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
                <details className="mt-3">
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
      <span className="tabular-nums text-slate-500">
        {op.duration_ms}ms
      </span>
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

function ParamHelp() {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">
        Faltam parâmetros na URL.
      </p>
      <p className="mt-2">
        Use o formato{" "}
        <code className="rounded bg-slate-200 px-1 font-mono text-xs">
          /trace?bot_id=&lt;ID&gt;&amp;contact_id=&lt;ID&gt;
        </code>{" "}
        para visualizar a telemetria de uma conversa específica.
      </p>
    </div>
  );
}

function ErrorState({ status }: { status: number | null }) {
  if (status === 403) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Você não tem acesso a este bot.
      </div>
    );
  }
  if (status === 404) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Contato não encontrado para este bot.
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      Erro ao carregar a conversa. Tente novamente em instantes.
    </div>
  );
}

function EmptyState() {
  return (
    <li className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      Sem mensagens nesta conversa.
    </li>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}
