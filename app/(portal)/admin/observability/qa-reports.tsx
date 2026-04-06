"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, MinusCircle, TrendingUp } from "lucide-react";
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
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Accuracy Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
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
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Heatmap({ report }: { report: QAReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Run: {formatDate(report.started_at)}
          <Badge
            variant={report.failed === 0 ? "default" : "destructive"}
            className={report.failed === 0 ? "bg-emerald-500" : ""}
          >
            {report.passed}/{report.total_tests} ({report.pass_rate}%)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Restaurant</TableHead>
                <TableHead className="text-center w-16">Cat.</TableHead>
                {SCENARIO_ORDER.map((s) => (
                  <TableHead key={s} className="text-center w-20 text-xs">
                    {SCENARIO_LABELS[s] ?? s}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.restaurants.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={r.name}>
                    {r.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {r.category}
                    </Badge>
                  </TableCell>
                  {SCENARIO_ORDER.map((scenario) => {
                    const result = r.scenarios[scenario];
                    return (
                      <TableCell key={scenario} className="text-center">
                        {result ? (
                          <StatusIcon passed={result.passed} status={result.status} />
                        ) : (
                          <MinusCircle className="h-4 w-4 text-slate-300 mx-auto" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
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
        <CardContent className="py-12 text-center text-muted-foreground">
          No QA test reports found. Run <code>/corpus-test</code> to generate reports.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend chart */}
      {allReports && allReports.length >= 2 && <TrendChart reports={allReports} />}

      {/* Run selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {reports.slice(0, 10).map((r, idx) => (
          <button
            key={r.filename}
            onClick={() => setSelectedIdx(idx)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              idx === selectedIdx
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {formatDate(r.last_modified)}
          </button>
        ))}
      </div>

      {/* Selected report heatmap */}
      {reportLoading ? (
        <Skeleton className="h-[300px]" />
      ) : selectedReport ? (
        <Heatmap report={selectedReport} />
      ) : null}
    </div>
  );
}
