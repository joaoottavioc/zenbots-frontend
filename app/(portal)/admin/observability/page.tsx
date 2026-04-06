"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QAReportsPanel } from "./qa-reports";
import { CorpusGamePanel } from "./corpus-game";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Zap, AlertTriangle, TrendingUp, ShieldAlert } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// --- Types ---

interface ServiceCost {
  service: string;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_api_calls: number;
  total_failed_calls: number;
}

interface OverviewResponse {
  days: number;
  total_cost_usd: number;
  services: ServiceCost[];
  total_bots: number;
}

interface DailyEntry {
  date: string;
  service: string;
  total_cost_usd: number;
  total_api_calls: number;
}

interface DailyResponse {
  days: number;
  daily: DailyEntry[];
}

interface LeaderboardBot {
  rank: number;
  bot_id: number;
  restaurant_name: string;
  user_id: number | null;
  total_cost_usd: number;
  total_api_calls: number;
  total_failed_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

interface LeaderboardResponse {
  days: number;
  bots: LeaderboardBot[];
}

// --- Helpers ---

const SERVICE_COLORS: Record<string, string> = {
  openai: "#3b82f6",
  google_maps: "#22c55e",
  whatsapp: "#f59e0b",
  aws_s3: "#6b7280",
  mercado_pago: "#8b5cf6",
  groq_whisper: "#ec4899",
  openai_whisper: "#06b6d4",
  facebook: "#1d4ed8",
};

const SERVICE_LABELS: Record<string, string> = {
  openai: "OpenAI",
  google_maps: "Google Maps",
  whatsapp: "WhatsApp",
  aws_s3: "AWS S3",
  mercado_pago: "Mercado Pago",
  groq_whisper: "Groq Whisper",
  openai_whisper: "OpenAI Whisper",
  facebook: "Facebook",
};

function formatUSD(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Pivot daily entries into chart-friendly rows: { date, openai, whatsapp, ... } */
function pivotDailyData(daily: DailyEntry[]): Record<string, string | number>[] {
  const byDate: Record<string, Record<string, number>> = {};
  for (const entry of daily) {
    if (!byDate[entry.date]) byDate[entry.date] = {};
    byDate[entry.date][entry.service] = (byDate[entry.date][entry.service] || 0) + entry.total_cost_usd;
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, services]) => ({
      date: date.slice(5), // "04-01" format
      ...services,
    }));
}

// --- Components ---

function AccessDenied() {
  return (
    <PageContainer>
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Acesso restrito. Apenas administradores podem ver esta pagina.
          </AlertDescription>
        </Alert>
      </div>
    </PageContainer>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className={`border-l-4 ${color} shadow-sm`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function ObservabilityPage() {
  const [days, setDays] = useState("30");
  const daysNum = parseInt(days);

  // Auth check
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["currentUser"],
    queryFn: async () => (await api.get("/auth/me")).data,
    staleTime: 1000 * 60 * 10,
  });

  // Admin data queries — only run if admin
  const isAdmin = user?.is_admin ?? false;

  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewResponse>({
    queryKey: ["admin-overview", daysNum],
    queryFn: async () => (await api.get(`/monitoring/admin/overview?days=${daysNum}`)).data,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery<DailyResponse>({
    queryKey: ["admin-daily", daysNum],
    queryFn: async () => (await api.get(`/monitoring/admin/daily?days=${daysNum}`)).data,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["admin-leaderboard", daysNum],
    queryFn: async () => (await api.get(`/monitoring/admin/leaderboard?days=${daysNum}`)).data,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });

  if (userLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </PageContainer>
    );
  }

  if (!isAdmin) return <AccessDenied />;

  const chartData = dailyData ? pivotDailyData(dailyData.daily) : [];
  const services = overview?.services ?? [];
  const totalCalls = services.reduce((s, svc) => s + svc.total_api_calls, 0);
  const totalFailed = services.reduce((s, svc) => s + svc.total_failed_calls, 0);
  const failRate = totalCalls > 0 ? ((totalFailed / totalCalls) * 100).toFixed(1) : "0";
  const projectedMonthly = overview
    ? (overview.total_cost_usd / daysNum) * 30
    : 0;

  // Collect all service keys present in chart data
  const serviceKeys = new Set<string>();
  for (const row of chartData) {
    for (const key of Object.keys(row)) {
      if (key !== "date") serviceKeys.add(key);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Observability"
        description="Platform cost monitoring and usage analytics"
      >
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="14">14 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <Tabs defaultValue="costs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="qa">QA Tests</TabsTrigger>
          <TabsTrigger value="corpus">Corpus Game</TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KPICard
              title="Total Spend"
              value={formatUSD(overview?.total_cost_usd ?? 0)}
              subtitle={`Last ${daysNum} days`}
              icon={DollarSign}
              color="border-l-blue-500"
            />
            <KPICard
              title="Projected Monthly"
              value={formatUSD(projectedMonthly)}
              subtitle="Based on current burn rate"
              icon={TrendingUp}
              color="border-l-emerald-500"
            />
            <KPICard
              title="API Calls"
              value={formatNumber(totalCalls)}
              subtitle={`${overview?.total_bots ?? 0} active bots`}
              icon={Zap}
              color="border-l-amber-500"
            />
            <KPICard
              title="Failure Rate"
              value={`${failRate}%`}
              subtitle={`${formatNumber(totalFailed)} failed calls`}
              icon={AlertTriangle}
              color="border-l-red-500"
            />
          </>
        )}
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Cost by Service</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <Skeleton className="h-[300px]" />
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No cost data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  width={60}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatUSD(Number(value)),
                    SERVICE_LABELS[String(name)] ?? String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Legend
                  formatter={(value: string) => SERVICE_LABELS[value] ?? value}
                  wrapperStyle={{ fontSize: 12 }}
                />
                {Array.from(serviceKeys).map((svc) => (
                  <Area
                    key={svc}
                    type="monotone"
                    dataKey={svc}
                    stackId="1"
                    stroke={SERVICE_COLORS[svc] ?? "#94a3b8"}
                    fill={SERVICE_COLORS[svc] ?? "#94a3b8"}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Service Breakdown + Leaderboard side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-[200px]" />
            ) : services.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services
                    .sort((a, b) => b.total_cost_usd - a.total_cost_usd)
                    .map((svc) => (
                      <TableRow key={svc.service}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: SERVICE_COLORS[svc.service] ?? "#94a3b8" }}
                            />
                            {SERVICE_LABELS[svc.service] ?? svc.service}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatUSD(svc.total_cost_usd)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNumber(svc.total_api_calls)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNumber(svc.total_input_tokens + svc.total_output_tokens)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Bot Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Bots by Cost</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <Skeleton className="h-[200px]" />
            ) : !leaderboard?.bots?.length ? (
              <p className="text-muted-foreground text-sm">No data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.bots.map((bot) => (
                    <TableRow key={bot.bot_id}>
                      <TableCell>
                        <Badge
                          variant={bot.rank <= 3 ? "default" : "secondary"}
                          className={
                            bot.rank === 1
                              ? "bg-amber-500"
                              : bot.rank === 2
                              ? "bg-slate-400"
                              : bot.rank === 3
                              ? "bg-amber-700"
                              : ""
                          }
                        >
                          {bot.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={bot.restaurant_name}>
                        {bot.restaurant_name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatUSD(bot.total_cost_usd)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(bot.total_api_calls)}
                        {bot.total_failed_calls > 0 && (
                          <span className="text-red-500 ml-1">
                            ({bot.total_failed_calls} err)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        <TabsContent value="qa" className="space-y-6">
          <QAReportsPanel />
        </TabsContent>

        <TabsContent value="corpus" className="space-y-6">
          <CorpusGamePanel />
        </TabsContent>

      </Tabs>
    </PageContainer>
  );
}
