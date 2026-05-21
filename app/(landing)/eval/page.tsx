/**
 * Public eval dashboard — P5 of plan/portfolio_pivot.md.
 *
 * Surfaces the corpus QA snapshot (docs/eval/latest.json in the backend
 * repo) so visitors can see, without signup, how the bot's comprehension
 * is measured. Most "AI engineer" portfolios skip eval entirely; making
 * it visible is the point.
 *
 * Data flow: backend `GET /public/eval/latest` reads the committed
 * snapshot and serves it with a 5-minute Cache-Control. This page
 * fetches client-side via the existing API base URL. No SSR — the page
 * is in the static-export `(landing)` route group, and the snapshot
 * refreshes when the backend redeploys, not when this page does.
 *
 * Layout intentionally restrained: numbers first, methodology second,
 * link to repo last. Recruiters scan, they don't read.
 */

"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

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

function apiBase(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;
  return fromEnv || "http://localhost:8000";
}

export default function EvalPage() {
  const [snapshot, setSnapshot] = useState<EvalSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase()}/public/eval/latest`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EvalSnapshot>;
      })
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((e: Error) => {
        if (!cancelled)
          setError(
            "Não foi possível carregar o snapshot agora. Tente novamente em instantes.",
          );
        console.error("eval snapshot fetch failed:", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 pt-28 pb-20">
        {/* Page header */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            AI engineering · Eval
          </p>
          <h1 className="font-heading mt-2 text-4xl font-semibold text-slate-900 sm:text-5xl">
            Compreensão medida, não prometida
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            Cada release passa por um corpus de conversas com gabarito —
            adicionar item, remover, modificar, sugerir, fechar pedido. O bot
            só &quot;entende&quot; se o estado final do carrinho bate. Sem
            conversinha: o número está aqui.
          </p>
        </div>

        {/* States: loading, error, loaded */}
        {!snapshot && !error && <SkeletonHeadline />}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        )}
        {snapshot && <Loaded snapshot={snapshot} />}
      </main>
      <Footer />
    </>
  );
}

function Loaded({ snapshot }: { snapshot: EvalSnapshot }) {
  const generated = new Date(snapshot.generated_at);
  const generatedLabel = generated.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Headline cards */}
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

      {/* Methodology */}
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
          <DetailRow
            label="Última execução"
            value={generatedLabel}
          />
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
            docs/eval/latest.json
          </code>{" "}
          do repositório — cada commit é uma medição histórica. O{" "}
          <code className="rounded bg-slate-200 px-1 font-mono">
            git log
          </code>{" "}
          desse arquivo é a evolução da compreensão.
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
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Testar o bot agora
          </a>
        </div>
      </section>

      {/* What this measures vs doesn't */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-emerald-700">O que isso mede</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Intenção (adicionar, remover, modificar, sugerir, fechar).</li>
            <li>• Estado final do carrinho após a interação.</li>
            <li>• Quantidades, modificadores e ambiguidades.</li>
            <li>• Consistência entre restaurantes diferentes (mesmo bot).</li>
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold text-amber-700">O que não mede</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Latência por mensagem (medida em separado).</li>
            <li>• Custo por conversa (ver{" "}
              <a href="/economics" className="underline">economics</a>{" "}— em breve).
            </li>
            <li>• Qualidade subjetiva da resposta — só correção funcional.</li>
            <li>• Cenários de áudio (eval de voz é separado).</li>
          </ul>
        </Card>
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
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
        className={`mt-2 font-heading text-4xl font-semibold ${
          highlight ? "text-amber-700" : "text-slate-900"
        } tabular-nums`}
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
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
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

function SkeletonHeadline() {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}
