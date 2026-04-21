"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QARunControls } from "./qa-run-controls";
import {
  SCENARIO_LABELS,
  SCENARIO_DESCRIPTIONS,
  SCENARIO_ORDER,
  SCENARIO_GROUPS,
} from "./qa-scenarios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  FileBarChart,
  History,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- Types ---

interface ScenarioResult {
  passed: boolean;
  status: string;
  // Added 2026-04-08 (Pillar 1, F8): per-cell sample aggregation for
  // multi-sample runs. When samples_per_restaurant > 1 these fields are
  // present and the heatmap renders a fraction badge instead of a binary
  // green/red icon. `passed` is conservative — true iff ALL samples passed.
  passed_count?: number;
  total_count?: number;
  pass_rate?: number;
  samples?: string[];
}

interface RestaurantResult {
  name: string;
  category: string;
  scenarios: Record<string, ScenarioResult>;
}

interface QAReport {
  run_type: string;
  started_at: string;
  finished_at: string;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  pass_rate: number;
  // Added 2026-04-07: comprehension-only metrics that exclude
  // greeting/suggestions/checkout (the easy 27% that inflates the headline).
  // Optional because reports written before this date won't have them.
  comprehension_total?: number;
  comprehension_passed?: number;
  comprehension_failed?: number;
  comprehension_skipped?: number;
  comprehension_pass_rate?: number;
  // Phase 1B (2026-04-09): per-restaurant consistency metrics. The launch
  // gate is "the bot performs CONSISTENTLY across restaurants", not just
  // "the average is high". Mean alone hides single-restaurant disasters.
  worst_restaurant_comp_rate?: number;
  worst_restaurant_name?: string | null;
  cross_restaurant_spread_pp?: number;
  // Added 2026-04-08 (P1 Day 1.5): per-run distribution of menu_type tags
  // across the sampled corpus entries. Used to flag "100% template" runs
  // that overstate real-world readiness.
  samples_by_tier?: Record<string, number>;
  // Added 2026-04-08 (Pillar 1, F8): how many pytest invocations per
  // restaurant the runner executed. N>1 means each cell aggregates multiple
  // independent attempts and the heatmap renders pass-rate fractions.
  samples_per_restaurant?: number;
  // Added 2026-04-09 (Phase 1C): which restaurant selection mode was used.
  // 'baseline' = locked 10-restaurant pool (clean per-fix attribution).
  // 'random' = random 5-restaurant sample (broad-baseline check).
  pool?: "random" | "baseline";
  // Added 2026-04-09 (Phase 1A): integrity flag set by _merge_sample_reports
  // when actual attempts < 85% of expected. 'partial' runs are corrupted by
  // OOM / interrupted execution and should NOT be treated as a baseline.
  integrity?: "ok" | "partial";
  integrity_warning?: string | null;
  expected_tests?: number;
  restaurants: RestaurantResult[];
  failure_summary: string | null;
}

interface ReportListItem {
  key: string;
  filename: string;
  last_modified: string;
  size_bytes: number;
}

// --- Helpers ---

function StatusIcon({ passed, status }: { passed: boolean; status: string }) {
  if (status === "skipped") return <MinusCircle className="h-4 w-4 text-slate-400" />;
  return passed
    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    : <XCircle className="h-4 w-4 text-red-500" />;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function getPassRateColor(rate: number): string {
  if (rate >= 90) return "text-emerald-500";
  if (rate >= 70) return "text-amber-500";
  return "text-red-500";
}

function getPassRateBadge(rate: number): "default" | "destructive" | "secondary" {
  if (rate >= 90) return "default";
  if (rate >= 70) return "secondary";
  return "destructive";
}

// --- Components ---

function TierWarning({ samples }: { samples?: Record<string, number> }) {
  if (!samples) return null;
  const entries = Object.entries(samples);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total === 0) return null;

  const templates = samples.template ?? 0;
  const templatePct = Math.round((templates / total) * 100);

  if (templatePct < 100) {
    // Mixed sampling: subtle informational note
    return (
      <div className="text-[11px] text-muted-foreground mt-1">
        Sampled corpus: {entries.map(([k, v]) => `${v} ${k}`).join(", ")}
      </div>
    );
  }

  // 100% template — overstated metric warning
  return (
    <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-amber-500/5 border border-amber-500/30">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-700">
        <strong>100% template sampling.</strong> This run measures against
        synthetic-looking menus, not real iFood / Rappi / Google Maps screenshots.
        Headline numbers <em>overstate</em> production-readiness. Add Tier 2
        menus via the Corpus Game and tag them <code>menu_type=&quot;tier2&quot;</code> to fix.
      </div>
    </div>
  );
}

function StatsAggregate({ reports }: { reports: QAReport[] }) {
  // Phase 1A: exclude partial-integrity reports from the aggregate so a
  // corrupted run (Run 3 / OOM-killed pytest / interrupted execution)
  // can't poison the rolling mean ± stddev.
  const cleanReports = reports.filter((r) => r.integrity !== "partial");
  const excludedCount = reports.length - cleanReports.length;
  if (cleanReports.length < 2) return null;

  const headlines = cleanReports
    .map((r) => r.pass_rate)
    .filter((v): v is number => typeof v === "number");
  const comps = cleanReports
    .map((r) => r.comprehension_pass_rate)
    .filter((v): v is number => typeof v === "number");

  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  const stddev = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance =
      arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
  };

  const headlineMean = mean(headlines);
  const headlineStd = stddev(headlines);
  const compMean = mean(comps);
  const compStd = comps.length >= 2 ? stddev(comps) : null;

  const stabilityLabel = (sd: number) =>
    sd < 2 ? "stable" : sd < 5 ? "noisy" : "very noisy";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Last {cleanReports.length}-clean-run aggregate
        </CardTitle>
        <CardDescription>
          Mean ± stddev across the {cleanReports.length} most recent clean reports — wide
          spreads mean small samples are hiding regressions
          {excludedCount > 0 && (
            <span className="text-red-600">
              {" "}
              · {excludedCount} partial run{excludedCount > 1 ? "s" : ""} excluded
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {comps.length >= 2 && compStd !== null ? (
            <div className="border-l-4 border-l-emerald-500 pl-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Comprehension
              </div>
              <div className="text-2xl font-bold font-heading">
                {compMean.toFixed(1)}%
                <span className="text-sm text-muted-foreground font-normal ml-1">
                  ± {compStd.toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {stabilityLabel(compStd)} ({comps.length} runs with comprehension data)
              </div>
            </div>
          ) : null}
          <div className="border-l-4 border-l-blue-500 pl-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Headline
            </div>
            <div className="text-2xl font-bold font-heading">
              {headlineMean.toFixed(1)}%
              <span className="text-sm text-muted-foreground font-normal ml-1">
                ± {headlineStd.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {stabilityLabel(headlineStd)} ({headlines.length} runs)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendChart({ reports }: { reports: QAReport[] }) {
  const data = reports
    .slice()
    .reverse()
    .map((r) => ({
      date: formatDate(r.started_at),
      headline: r.pass_rate,
      comprehension: r.comprehension_pass_rate ?? null,
    }));

  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Accuracy Trend
        </CardTitle>
        <CardDescription>
          Headline (all scenarios) vs Comprehension (excludes greet/sugg/checkout)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11 }}
              width={45}
            />
            <Tooltip
              formatter={(value, name) => [`${Number(value)}%`, name === "headline" ? "Headline" : "Comprehension"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="headline"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: "hsl(var(--muted-foreground))" }}
            />
            <Line
              type="monotone"
              dataKey="comprehension"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Phase 1B (2026-04-09): launch-gate thresholds for the three comprehension
// metrics. The bot is launch-ready only when ALL THREE pass:
//   - mean comprehension ≥ 80%
//   - worst-restaurant comprehension ≥ 70%
//   - cross-restaurant spread ≤ 12pp
const LAUNCH_GATE_MEAN = 80;
const LAUNCH_GATE_WORST = 70;
const LAUNCH_GATE_SPREAD = 12;

function getWorstColor(rate: number): string {
  if (rate >= LAUNCH_GATE_WORST) return "text-emerald-500";
  if (rate >= 50) return "text-amber-500";
  return "text-red-500";
}

function getSpreadColor(spread: number): string {
  if (spread <= LAUNCH_GATE_SPREAD) return "text-emerald-500";
  if (spread <= 20) return "text-amber-500";
  return "text-red-500";
}

function KPISummary({ report }: { report: QAReport }) {
  const duration =
    report.finished_at && report.started_at
      ? Math.round(
          (new Date(report.finished_at).getTime() -
            new Date(report.started_at).getTime()) /
            1000,
        )
      : null;
  const hasComp = typeof report.comprehension_pass_rate === "number";
  const hasConsistency =
    typeof report.worst_restaurant_comp_rate === "number" &&
    typeof report.cross_restaurant_spread_pp === "number";

  // Legacy report (no comprehension): show the original 4-box layout
  if (!hasComp) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Pass Rate
            </div>
            <div
              className={`text-2xl font-bold font-heading ${getPassRateColor(report.pass_rate)}`}
            >
              {report.pass_rate}%
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Total Tests
            </div>
            <div className="text-2xl font-bold font-heading">
              {report.total_tests}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Failed
            </div>
            <div className="text-2xl font-bold font-heading text-red-500">
              {report.failed}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Duration
            </div>
            <div className="text-2xl font-bold font-heading">
              {duration ? `${duration}s` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Modern report (has comprehension): two rows
  // Row 1: Comprehension launch gate — Mean / Worst / Spread
  // Row 2: Secondary — Headline / Failed / Duration
  return (
    <div className="space-y-3">
      {/* Row 1 — comprehension launch-gate metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Mean Comprehension</span>
              <span className="text-[9px] font-normal opacity-60">
                gate ≥ {LAUNCH_GATE_MEAN}%
              </span>
            </div>
            <div
              className={`text-2xl font-bold font-heading ${getPassRateColor(report.comprehension_pass_rate!)}`}
            >
              {report.comprehension_pass_rate}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {report.comprehension_passed}/{report.comprehension_total} (excludes greet/sugg/checkout)
            </div>
          </CardContent>
        </Card>
        {hasConsistency ? (
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Worst Restaurant</span>
                <span className="text-[9px] font-normal opacity-60">
                  gate ≥ {LAUNCH_GATE_WORST}%
                </span>
              </div>
              <div
                className={`text-2xl font-bold font-heading ${getWorstColor(report.worst_restaurant_comp_rate!)}`}
              >
                {report.worst_restaurant_comp_rate}%
              </div>
              <div
                className="text-[10px] text-muted-foreground mt-0.5 truncate"
                title={report.worst_restaurant_name ?? undefined}
              >
                {report.worst_restaurant_name ?? "—"}
              </div>
            </CardContent>
          </Card>
        ) : null}
        {hasConsistency ? (
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Cross-Rest. Spread</span>
                <span className="text-[9px] font-normal opacity-60">
                  gate ≤ {LAUNCH_GATE_SPREAD}pp
                </span>
              </div>
              <div
                className={`text-2xl font-bold font-heading ${getSpreadColor(report.cross_restaurant_spread_pp!)}`}
              >
                ±{report.cross_restaurant_spread_pp}pp
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                stddev across restaurants
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Row 2 — secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Headline (all scenarios)
            </div>
            <div className="text-2xl font-bold font-heading">
              {report.pass_rate}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {report.passed}/{report.total_tests}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Failed
            </div>
            <div className="text-2xl font-bold font-heading text-red-500">
              {report.failed}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Duration
            </div>
            <div className="text-2xl font-bold font-heading">
              {duration ? `${duration}s` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScenarioCell({
  result,
  multiSample,
}: {
  result: ScenarioResult | undefined;
  multiSample: boolean;
}) {
  if (!result) {
    return (
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-50">
        <MinusCircle className="h-3.5 w-3.5 text-slate-300" />
      </div>
    );
  }

  // Multi-sample run with per-cell aggregation: render fraction badge,
  // shaded by pass rate (red → amber → emerald) instead of binary green/red.
  const hasSamples =
    multiSample &&
    typeof result.passed_count === "number" &&
    typeof result.total_count === "number" &&
    result.total_count > 0;

  if (hasSamples) {
    const passed = result.passed_count!;
    const total = result.total_count!;
    const pct = passed / total;
    const bg =
      pct >= 0.999
        ? "bg-emerald-100 text-emerald-700"
        : pct >= 0.66
          ? "bg-emerald-50 text-emerald-600"
          : pct >= 0.34
            ? "bg-amber-100 text-amber-700"
            : pct > 0
              ? "bg-red-50 text-red-600"
              : "bg-red-100 text-red-700";
    return (
      <div
        className={`inline-flex items-center justify-center min-w-[28px] h-7 rounded-md text-[11px] font-mono font-semibold px-1.5 ${bg}`}
        title={`${passed}/${total} samples passed (${Math.round(pct * 100)}%)`}
      >
        {passed}/{total}
      </div>
    );
  }

  // Single-sample fallback: original binary icon
  return (
    <div
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${
        result.status === "skipped"
          ? "bg-slate-100"
          : result.passed
            ? "bg-emerald-100"
            : "bg-red-100"
      }`}
    >
      <StatusIcon passed={result.passed} status={result.status} />
    </div>
  );
}

function Heatmap({ report }: { report: QAReport }) {
  const samplesPerRestaurant = report.samples_per_restaurant ?? 1;
  const multiSample = samplesPerRestaurant > 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
            Scenario Heatmap
            {report.pool === "baseline" && (
              <Badge
                variant="outline"
                className="text-[10px] font-normal border-emerald-500/50 text-emerald-600"
              >
                baseline pool
              </Badge>
            )}
            {multiSample && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {samplesPerRestaurant}× sampling
              </Badge>
            )}
          </CardTitle>
          <Badge
            variant={getPassRateBadge(report.pass_rate)}
            className={report.pass_rate >= 90 ? "bg-emerald-600" : ""}
          >
            {report.passed}/{report.total_tests} passed ({report.pass_rate}%)
          </Badge>
        </div>
        {report.integrity === "partial" && (
          <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-red-500/10 border border-red-500/40">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div className="text-xs text-red-700">
              <strong>⚠ Partial run — results unreliable.</strong>{" "}
              {report.integrity_warning ?? (
                <>
                  Only {report.total_tests}/{report.expected_tests} expected attempts captured.
                  Headline numbers should NOT be trusted as a baseline data point.
                </>
              )}
            </div>
          </div>
        )}
        <TierWarning samples={report.samples_by_tier} />
        {report.failure_summary && (
          <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600">{report.failure_summary}</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Restaurant</TableHead>
                <TableHead className="text-center w-16">Cat.</TableHead>
                {SCENARIO_ORDER.map((s) => {
                  const info = SCENARIO_DESCRIPTIONS[s];
                  const tooltip = info
                    ? `${info.title}\n\n${info.desc}\n\nExemplo: ${info.example}`
                    : s;
                  return (
                    <TableHead
                      key={s}
                      className="text-center w-20 text-xs px-1 cursor-help"
                      title={tooltip}
                    >
                      {SCENARIO_LABELS[s] ?? s}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.restaurants.map((r) => {
                const scenarioKeys = Object.keys(r.scenarios);
                const passCount = scenarioKeys.filter(k => r.scenarios[k]?.passed).length;
                const totalCount = scenarioKeys.length;
                const allPassed = passCount === totalCount && totalCount > 0;

                return (
                  <TableRow key={r.name} className={allPassed ? "bg-emerald-500/5" : ""}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={r.name}>
                      {r.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {r.category}
                      </Badge>
                    </TableCell>
                    {SCENARIO_ORDER.map((scenario) => (
                      <TableCell key={scenario} className="text-center px-1">
                        <ScenarioCell
                          result={r.scenarios[scenario]}
                          multiSample={multiSample}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ScenarioGuide() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left w-full group"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-heading">
            Guia dos Cenários
          </CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">
            {open ? "Ocultar" : "O que cada coluna testa?"}
          </span>
        </button>
      </CardHeader>
      {open && (
        <CardContent>
          <div className="space-y-5">
            {SCENARIO_GROUPS.map((group) => (
              <div key={group.title}>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                  {group.title}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.ids.map((id) => {
                    const info = SCENARIO_DESCRIPTIONS[id];
                    if (!info) return null;
                    return (
                      <div
                        key={id}
                        className="border-l-2 border-l-muted pl-3 py-1"
                      >
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {SCENARIO_LABELS[id] ?? id}
                          </Badge>
                          <span className="text-sm font-medium">{info.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {info.desc}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 italic mt-1">
                          {info.example}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border">
            <strong>Compreensão</strong> = média das colunas acima, exceto{" "}
            <em>Checkout</em> e <em>Greet</em> (testes de estado, fáceis demais —
            inflavam a métrica). As 3 gates de lançamento usam só a Compreensão.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

// --- Main Export ---

export function QAReportsPanel() {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { data: reportList, isLoading: listLoading } = useQuery<{ reports: ReportListItem[] }>({
    queryKey: ["admin-qa-runs"],
    queryFn: async () => (await api.get("/monitoring/admin/qa/runs?limit=20")).data,
    staleTime: 1000 * 60 * 5,
  });

  const reports = reportList?.reports ?? [];
  const selectedFilename = reports[selectedIdx]?.filename;

  const { data: selectedReport, isLoading: reportLoading } = useQuery<QAReport>({
    queryKey: ["admin-qa-run", selectedFilename],
    queryFn: async () => (await api.get(`/monitoring/admin/qa/run/${selectedFilename}`)).data,
    enabled: !!selectedFilename,
    staleTime: 1000 * 60 * 60,
  });

  // Fetch all reports for the trend chart (up to 10 most recent)
  const recentFilenames = reports.slice(0, 10).map((r) => r.filename);
  const { data: allReports } = useQuery<QAReport[]>({
    queryKey: ["admin-qa-all-reports", recentFilenames.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        recentFilenames.map(async (fn) => {
          try {
            return (await api.get(`/monitoring/admin/qa/run/${fn}`)).data as QAReport;
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean) as QAReport[];
    },
    enabled: recentFilenames.length > 0,
    staleTime: 1000 * 60 * 60,
  });

  if (listLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="space-y-6">
        <QARunControls />
        <Card>
          <CardContent className="py-16 text-center">
            <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No QA test reports found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the controls above to run your first QA test.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Run controls — moved here from the Corpus Game tab */}
      <QARunControls />

      {/* Recent N-run aggregate (mean ± stddev) */}
      {allReports && allReports.length >= 2 && <StatsAggregate reports={allReports} />}

      {/* Trend chart */}
      {allReports && allReports.length >= 2 && <TrendChart reports={allReports} />}

      {/* Run selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Test Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {reports.slice(0, 10).map((r, idx) => (
              <Button
                key={r.filename}
                variant={idx === selectedIdx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedIdx(idx)}
                className="text-xs"
              >
                {formatDate(r.last_modified)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Guide (collapsible) */}
      <ScenarioGuide />

      {/* Selected report */}
      {reportLoading ? (
        <Skeleton className="h-[300px]" />
      ) : selectedReport ? (
        <div className="space-y-4">
          <KPISummary report={selectedReport} />
          <Heatmap report={selectedReport} />
        </div>
      ) : null}
    </div>
  );
}
