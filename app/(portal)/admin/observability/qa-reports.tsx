"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const SCENARIO_LABELS: Record<string, string> = {
  add_single: "Add",
  add_multi: "Multi",
  unavailable: "Unavail",
  remove: "Remove",
  suggestions: "Suggest",
  checkout: "Checkout",
  greeting: "Greet",
  abbreviation: "Abbrev",
  double_add: "Dbl Add",
  question: "Question",
  add_remove: "Add/Rm",
};

const SCENARIO_ORDER = [
  "add_single", "add_multi", "unavailable", "remove",
  "suggestions", "checkout", "greeting",
  "abbreviation", "double_add", "question", "add_remove",
];

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

function TrendChart({ reports }: { reports: QAReport[] }) {
  const data = reports
    .slice()
    .reverse()
    .map((r) => ({
      date: formatDate(r.started_at),
      pass_rate: r.pass_rate,
      total: r.total_tests,
    }));

  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Accuracy Trend
        </CardTitle>
        <CardDescription>Pass rate across recent QA test runs</CardDescription>
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
              formatter={(value) => [`${Number(value)}%`, "Pass Rate"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="pass_rate"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function KPISummary({ report }: { report: QAReport }) {
  const duration = report.finished_at && report.started_at
    ? Math.round((new Date(report.finished_at).getTime() - new Date(report.started_at).getTime()) / 1000)
    : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pass Rate</div>
          <div className={`text-2xl font-bold font-heading ${getPassRateColor(report.pass_rate)}`}>
            {report.pass_rate}%
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Tests</div>
          <div className="text-2xl font-bold font-heading">{report.total_tests}</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Failed</div>
          <div className="text-2xl font-bold font-heading text-red-500">{report.failed}</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-slate-400">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</div>
          <div className="text-2xl font-bold font-heading">
            {duration ? `${duration}s` : "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Heatmap({ report }: { report: QAReport }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
            Scenario Heatmap
          </CardTitle>
          <Badge
            variant={getPassRateBadge(report.pass_rate)}
            className={report.pass_rate >= 90 ? "bg-emerald-600" : ""}
          >
            {report.passed}/{report.total_tests} passed ({report.pass_rate}%)
          </Badge>
        </div>
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
                {SCENARIO_ORDER.map((s) => (
                  <TableHead key={s} className="text-center w-20 text-xs px-1">
                    {SCENARIO_LABELS[s] ?? s}
                  </TableHead>
                ))}
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
                    {SCENARIO_ORDER.map((scenario) => {
                      const result = r.scenarios[scenario];
                      return (
                        <TableCell key={scenario} className="text-center px-1">
                          {result ? (
                            <div className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${
                              result.status === "skipped"
                                ? "bg-slate-100"
                                : result.passed
                                ? "bg-emerald-100"
                                : "bg-red-100"
                            }`}>
                              <StatusIcon passed={result.passed} status={result.status} />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-50">
                              <MinusCircle className="h-3.5 w-3.5 text-slate-300" />
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
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
      <Card>
        <CardContent className="py-16 text-center">
          <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No QA test reports found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run QA tests from the Corpus Game tab to generate reports
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
