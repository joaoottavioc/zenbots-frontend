"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2 } from "lucide-react";
import { BotReadingAnimation } from "@/components/ui/bot-reading-animation";

interface RunStatus {
  in_progress: boolean;
  owner_id?: string;
  started_at?: number;
  elapsed_seconds?: number;
  log_tail?: string;
}

type Pool = "random" | "baseline" | "prospect";
type Samples = 1 | 3 | 5;

// Total distinct scenarios in the suite (mirrors SCENARIO_ORDER in qa-reports.tsx).
// Used only for the "X of Y tests" denominator — not authoritative, so a drift of
// ±1 scenario is cosmetic, not correctness.
const SCENARIO_COUNT = 21;

interface ParsedLog {
  percent: number | null;
  currentScenario: string | null;
  currentRestaurant: string | null;
  passed: number;
  failed: number;
  skipped: number;
}

function parseLogTail(log: string | undefined): ParsedLog {
  const empty: ParsedLog = {
    percent: null,
    currentScenario: null,
    currentRestaurant: null,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  if (!log) return empty;

  // pytest-progress writes "... [ 42%]" on each line; keep the last one we see.
  let percent: number | null = null;
  const pctRe = /\[\s*(\d+)%\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = pctRe.exec(log)) !== null) {
    percent = parseInt(m[1], 10);
  }

  // Parametrized test IDs: test_scenario[restaurant-sample_N]
  let currentScenario: string | null = null;
  let currentRestaurant: string | null = null;
  const testRe = /test_([a-z_]+)\[([^\]\s-]+)(?:-sample_\d+)?\]/g;
  while ((m = testRe.exec(log)) !== null) {
    currentScenario = m[1];
    currentRestaurant = m[2];
  }

  const passed = (log.match(/\bPASSED\b/g) ?? []).length;
  const failed = (log.match(/\bFAILED\b/g) ?? []).length;
  const skipped = (log.match(/\bSKIPPED\b/g) ?? []).length;

  return { percent, currentScenario, currentRestaurant, passed, failed, skipped };
}

function fmtDuration(s: number): string {
  if (s < 60) return `${Math.max(0, Math.floor(s))}s`;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return r ? `${m}m ${r}s` : `${m}m`;
}

function RunProgressPanel({
  status,
  elapsedSec,
  pool,
  samples,
  logTail,
}: {
  status: "pending" | "running";
  elapsedSec: number;
  pool: Pool;
  samples: Samples;
  logTail?: string;
}) {
  const parsed = useMemo(() => parseLogTail(logTail), [logTail]);

  const nRestaurants = pool === "baseline" ? 11 : pool === "prospect" ? 10 : 5;
  const totalExpectedTests = nRestaurants * SCENARIO_COUNT * samples;
  const expectedSec = 60 * nRestaurants * samples;

  // Progress: prefer pytest %, else asymptotic elapsed/expected capped at 92%.
  const pct =
    parsed.percent !== null
      ? parsed.percent
      : Math.min((elapsedSec / expectedSec) * 92, 92);

  const etaSec =
    parsed.percent !== null && parsed.percent > 0 && parsed.percent < 100
      ? (elapsedSec / parsed.percent) * (100 - parsed.percent)
      : Math.max(0, expectedSec - elapsedSec);

  const completedTests = parsed.passed + parsed.failed + parsed.skipped;

  const stageLabel =
    status === "pending" && !parsed.currentScenario
      ? "Aguardando resposta do servidor..."
      : parsed.currentScenario
        ? `Executando ${parsed.currentScenario}${
            parsed.currentRestaurant ? ` @ ${parsed.currentRestaurant}` : ""
          }`
        : "Inicializando suíte...";

  return (
    <div className="rounded-lg border border-cyan-500/25 bg-gradient-to-br from-cyan-50/60 to-blue-50/40 p-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 -my-2 -ml-2 hidden sm:block">
          <BotReadingAnimation progress={pct} status="active" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">
              QA run em andamento
            </div>
            <div className="text-xs font-mono text-cyan-700 tabular-nums">
              {Math.round(pct)}%
            </div>
          </div>

          <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="text-xs text-slate-700 truncate" title={stageLabel}>
            {stageLabel}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <Stat label="Decorrido" value={fmtDuration(elapsedSec)} />
            <Stat
              label="ETA"
              value={etaSec > 1 ? `~${fmtDuration(etaSec)}` : "concluindo"}
            />
            <Stat
              label="Testes"
              value={`${completedTests}/${totalExpectedTests}`}
            />
            <Stat
              label="Passou / Falhou"
              value={
                <span className="font-mono">
                  <span className="text-emerald-600">{parsed.passed}</span>
                  <span className="text-slate-400 mx-0.5">·</span>
                  <span
                    className={
                      parsed.failed > 0 ? "text-red-600" : "text-slate-400"
                    }
                  >
                    {parsed.failed}
                  </span>
                </span>
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-cyan-500/15 text-[10px] text-slate-600">
        <span className="font-mono">{pool}</span> · {samples}× sampling ·
        fechando a aba o run continua no servidor
      </div>

      {logTail && logTail.trim().length > 0 && (
        <details className="mt-2 group">
          <summary className="text-[11px] cursor-pointer text-cyan-700 hover:text-cyan-900 select-none list-none flex items-center gap-1">
            <span className="transition-transform group-open:rotate-90">›</span>
            Ver log (últimas linhas)
          </summary>
          <pre className="mt-2 text-[10px] font-mono bg-slate-950 text-slate-300 p-3 rounded max-h-40 overflow-auto whitespace-pre-wrap">
            {logTail.split("\n").slice(-15).join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground uppercase tracking-wider text-[9px] mb-0.5">
        {label}
      </div>
      <div className="font-semibold text-slate-900 text-sm tabular-nums">
        {value}
      </div>
    </div>
  );
}

export function QARunControls() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Samples: 1 = fast/noisy, 3 = variance-reduced baseline, 5 = high-fidelity
  const [samples, setSamples] = useState<Samples>(3);
  // Pool: random = 5 random; baseline = locked 10-restaurant pool; prospect = demo menus
  const [pool, setPool] = useState<Pool>("baseline");

  // Poll server for in-progress state (survives tab switches)
  const { data: runStatus } = useQuery<RunStatus>({
    queryKey: ["admin-qa-run-status"],
    queryFn: async () => (await api.get("/monitoring/admin/corpus/run-tests/status")).data,
    refetchInterval: 3000,
    staleTime: 0,
  });
  const serverInProgress = runStatus?.in_progress ?? false;
  const elapsedSec = runStatus?.elapsed_seconds ?? 0;

  const runTestsMutation = useMutation({
    mutationFn: async () => {
      const nRestaurants = pool === "baseline" ? 11 : pool === "prospect" ? 10 : 5;
      const timeoutMs = (60 * nRestaurants * samples + 240) * 1000;
      const resp = await api.post(
        `/monitoring/admin/corpus/run-tests?samples=${samples}&pool=${pool}`,
        {},
        { timeout: timeoutMs },
      );
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-qa-runs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-qa-run-status"] });
      toast({
        title: "QA run complete",
        description: "Fetching the new report...",
        className: "bg-green-50 border-green-200",
      });
    },
    onError: (error: unknown) => {
      const msg = (error as Error)?.message || "Run failed";
      toast({ title: "QA run error", description: msg, variant: "destructive" });
    },
  });

  const isRunning = runTestsMutation.isPending || serverInProgress;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          Run QA Tests
        </CardTitle>
        <CardDescription>
          Executa a suíte de 21 cenários contra o pool selecionado. Resultados chegam ao relatório abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live progress panel */}
        {isRunning && (
          <RunProgressPanel
            status={serverInProgress ? "running" : "pending"}
            elapsedSec={elapsedSec}
            pool={pool}
            samples={samples}
            logTail={runStatus?.log_tail}
          />
        )}

        {/* Run button */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => runTestsMutation.mutate()}
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Rodando..." : `Run QA Tests · ${pool} · ${samples}×`}
          </Button>
        </div>

        {/* Samples selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground w-16">Samples:</span>
          {([1, 3, 5] as Samples[]).map((n) => (
            <Button
              key={n}
              size="sm"
              variant={samples === n ? "default" : "outline"}
              onClick={() => setSamples(n)}
              disabled={isRunning}
              className="h-7 px-3 text-[11px]"
            >
              {n}×
            </Button>
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {samples === 1 && "rápido, com mais ruído por amostragem"}
            {samples === 3 && "variância reduzida (~1.7× menos ruído)"}
            {samples === 5 && "alta fidelidade, ~5 min/restaurante"}
          </span>
        </div>

        {/* Pool selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground w-16">Pool:</span>
          {(["random", "baseline", "prospect"] as Pool[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={pool === p ? "default" : "outline"}
              onClick={() => setPool(p)}
              disabled={isRunning}
              className="h-7 px-3 text-[11px]"
            >
              {p}
            </Button>
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {pool === "random" && "5 restaurantes aleatórios — check amplo"}
            {pool === "baseline" && "pool travado — atribuição limpa por fix"}
            {pool === "prospect" && "pool de prospects — verificar demos antes de visitas"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
