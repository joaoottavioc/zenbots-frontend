"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Undo2,
  Play,
  FlaskConical,
  ImageIcon,
  Loader2,
  Trophy,
  Flame,
  Zap,
  Star,
  ChevronRight,
  Keyboard,
  Target,
  BarChart3,
} from "lucide-react";

// --- Types ---

interface PendingImage {
  src: string;
  alt: string;
}

interface CorpusStats {
  total: number;
  validated: number;
  rejected: number;
  unvalidated: number;
  categories: Record<string, number>;
}

interface AcceptResult {
  id: string;
  file: string;
  size_kb: number;
  total: number;
}

// --- Pipeline Stepper ---

type StepStatus = "pending" | "active" | "done" | "failed";

interface PipelineStep {
  label: string;
  detail?: string;
  status: StepStatus;
}

const QA_STEPS = [
  { label: "Pre-run cleanup", threshold: 0 },
  { label: "Creating test bots", threshold: 5 },
  { label: "Running scenarios", threshold: 25 },
  { label: "Parsing results", threshold: 70 },
  { label: "Uploading report", threshold: 78 },
  { label: "Final cleanup", threshold: 83 },
];

const VALIDATE_STEPS = [
  { label: "Starting validation", threshold: 0 },
  { label: "Processing images (gpt-4o vision)", threshold: 3 },
  { label: "Extracting products", threshold: 10 },
  { label: "Finalizing results", threshold: -1 }, // activated at ~90% of total
];

function getActiveStepByTime(
  steps: { label: string; threshold: number }[],
  elapsed: number,
  imageCount?: number,
): PipelineStep[] {
  // For validate, the last step activates at ~90% of estimated total
  const estimatedTotal = imageCount ? Math.max(imageCount * 2, 30) : 120;

  return steps.map((step, idx) => {
    const nextThreshold = idx < steps.length - 1
      ? steps[idx + 1].threshold === -1
        ? estimatedTotal * 0.9
        : steps[idx + 1].threshold
      : Infinity;
    const currentThreshold = step.threshold === -1 ? estimatedTotal * 0.9 : step.threshold;

    let status: StepStatus = "pending";
    if (elapsed >= currentThreshold && elapsed < nextThreshold) {
      status = "active";
    } else if (elapsed >= nextThreshold) {
      status = "done";
    }
    return { label: step.label, status };
  });
}

function parseQAStdout(stdout: string): PipelineStep[] {
  const lines = stdout.toLowerCase();
  const steps: PipelineStep[] = [
    {
      label: "Pre-run cleanup",
      status: lines.includes("pre-run cleanup") ? "done" : "pending",
    },
    {
      label: "Creating test bots",
      status: lines.includes("bots ready") ? "done" : lines.includes("creating") ? "done" : "pending",
      detail: (() => {
        const match = stdout.match(/(\d+) bots ready/);
        return match ? `${match[1]} bots created` : undefined;
      })(),
    },
    {
      label: "Running scenarios",
      status: lines.includes("failed") || lines.includes("passed") ? "done" : "pending",
      detail: (() => {
        const match = stdout.match(/=+\s*(\d+)\s*failed.*?(\d+)\s*passed/i)
          || stdout.match(/(\d+)\s*failed.*?(\d+)\s*passed/i);
        if (match) return `${match[2]} passed, ${match[1]} failed`;
        return undefined;
      })(),
    },
    {
      label: "Parsing results",
      status: lines.includes("done") || lines.includes("cleaning up") ? "done" : "pending",
    },
    {
      label: "Uploading report",
      status: lines.includes("done") ? "done" : "pending",
    },
    {
      label: "Final cleanup",
      status: lines.includes("done") ? "done" : lines.includes("cleaning up") ? "active" : "pending",
      detail: lines.includes("done") ? "Done!" : undefined,
    },
  ];
  // If stdout includes "done", mark all as done
  if (lines.includes("done!")) {
    return steps.map((s) => ({ ...s, status: "done" as StepStatus }));
  }
  return steps;
}

function parseValidateStdout(stdout: string, imageCount: number): PipelineStep[] {
  const lines = stdout.toLowerCase();
  const okCount = (stdout.match(/\.\.\.\s*OK/gi) || []).length;
  const rejectedCount = (stdout.match(/\.\.\.\s*REJECTED/gi) || []).length;
  const processedCount = okCount + rejectedCount;
  const isDone = lines.includes("done!");

  const steps: PipelineStep[] = [
    {
      label: "Starting validation",
      status: lines.includes("validating") || isDone ? "done" : "pending",
      detail: (() => {
        const match = stdout.match(/Validating (\d+) images/i);
        return match ? `${match[1]} images queued` : undefined;
      })(),
    },
    {
      label: "Processing images (gpt-4o vision)",
      status: isDone ? "done" : processedCount > 0 ? "done" : "pending",
      detail: processedCount > 0 ? `${processedCount}/${imageCount} processed` : undefined,
    },
    {
      label: "Extracting products",
      status: isDone ? "done" : processedCount > 0 ? "done" : "pending",
      detail: okCount > 0 ? `${okCount} menus extracted` : undefined,
    },
    {
      label: "Finalizing results",
      status: isDone ? "done" : "pending",
      detail: isDone ? `Validated: ${okCount}, Rejected: ${rejectedCount}` : undefined,
    },
  ];
  return steps;
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "done":
      return (
        <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      );
    case "active":
      return (
        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        </div>
      );
    case "failed":
      return (
        <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <XCircle className="h-4 w-4 text-red-600" />
        </div>
      );
    default:
      return (
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        </div>
      );
  }
}

function PipelineStepper({
  steps,
  elapsed,
  formatElapsed,
  subtitle,
}: {
  steps: PipelineStep[];
  elapsed: number;
  formatElapsed: (s: number) => string;
  subtitle?: string;
}) {
  return (
    <Card className="border-blue-500/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Pipeline Running</span>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {formatElapsed(elapsed)}
          </Badge>
        </div>

        <div className="space-y-0">
          {steps.map((step, idx) => (
            <div key={step.label} className="flex gap-3">
              {/* Vertical line + icon column */}
              <div className="flex flex-col items-center">
                <StepIcon status={step.status} />
                {idx < steps.length - 1 && (
                  <div className={`w-px flex-1 min-h-[16px] ${
                    step.status === "done" ? "bg-emerald-300" : "bg-border"
                  }`} />
                )}
              </div>
              {/* Label + detail */}
              <div className={`pb-3 ${idx === steps.length - 1 ? "pb-0" : ""}`}>
                <span className={`text-sm leading-6 ${
                  step.status === "active" ? "font-medium text-foreground" :
                  step.status === "done" ? "text-muted-foreground" :
                  "text-muted-foreground/60"
                }`}>
                  {step.label}
                </span>
                {step.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {subtitle && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CompletedPipeline({
  steps,
  elapsed,
  formatElapsed,
  stdout,
  stderr,
}: {
  steps: PipelineStep[];
  elapsed: number;
  formatElapsed: (s: number) => string;
  stdout: string;
  stderr: string;
}) {
  const [showLog, setShowLog] = useState(false);
  const hasFailed = steps.some((s) => s.status === "failed");
  const fullLog = stdout + (stderr ? "\n" + stderr : "");

  return (
    <Card className={hasFailed ? "border-red-500/30" : "border-emerald-500/30"}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {hasFailed ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-sm font-medium">
              {hasFailed ? "Pipeline Failed" : "Pipeline Complete"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {formatElapsed(elapsed)}
            </Badge>
            {fullLog && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowLog(!showLog)}>
                {showLog ? "Hide log" : "View log"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-0">
          {steps.map((step, idx) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepIcon status={step.status} />
                {idx < steps.length - 1 && (
                  <div className={`w-px flex-1 min-h-[16px] ${
                    step.status === "done" ? "bg-emerald-300" :
                    step.status === "failed" ? "bg-red-300" : "bg-border"
                  }`} />
                )}
              </div>
              <div className={`pb-3 ${idx === steps.length - 1 ? "pb-0" : ""}`}>
                <span className={`text-sm leading-6 ${
                  step.status === "failed" ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
                {step.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {showLog && fullLog && (
          <pre className="text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto text-muted-foreground mt-4 pt-3 border-t">
            {fullLog}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

// --- Constants ---

const LEVEL_SIZE = 10;

const LEVEL_TITLES = [
  "Trainee",
  "Classifier",
  "Specialist",
  "Expert",
  "Master",
  "Grand Master",
  "Legend",
];

function getLevelTitle(level: number): string {
  const idx = Math.min(level - 1, LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[idx];
}

function getLevelColor(level: number): string {
  if (level >= 7) return "text-amber-400";
  if (level >= 5) return "text-purple-400";
  if (level >= 3) return "text-blue-400";
  return "text-emerald-400";
}

// --- Component ---

export function CorpusGamePanel() {
  const queryClient = useQueryClient();

  // Game state
  const [cursor, setCursor] = useState(0);
  const [levelAccepted, setLevelAccepted] = useState(0);
  const [totalAccepted, setTotalAccepted] = useState(0);
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "skip" | "error" } | null>(null);
  const [history, setHistory] = useState<Array<{ action: string; cursor: number }>>([]);

  // Fetch pending images
  const { data: pendingData, isLoading: loadingImages } = useQuery({
    queryKey: ["corpus-pending", 0],
    queryFn: async () => {
      const resp = await api.get(`/monitoring/admin/corpus/pending?limit=2000`);
      return resp.data as { images: PendingImage[]; total: number };
    },
    staleTime: 1000 * 60 * 30,
  });

  // Fetch stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["corpus-stats"],
    queryFn: async () => {
      const resp = await api.get("/monitoring/admin/corpus/stats");
      return resp.data as CorpusStats;
    },
    staleTime: 1000 * 30,
  });

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: async (image: PendingImage) => {
      const resp = await api.post("/monitoring/admin/corpus/accept", {
        src: image.src,
        alt: image.alt,
      });
      return resp.data as AcceptResult;
    },
    onSuccess: (data) => {
      setLevelAccepted((prev) => {
        const next = prev + 1;
        if (next >= LEVEL_SIZE) setShowLevelComplete(true);
        return next;
      });
      setTotalAccepted((prev) => prev + 1);
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      setHistory((prev) => [...prev, { action: "accept", cursor }]);
      showToastMsg(`#${data.total} saved (${data.size_kb}KB)`, "success");
      setCursor((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["corpus-stats"] });
    },
    onError: () => {
      showToastMsg("Download failed, skipping...", "skip");
      setCursor((prev) => prev + 1);
    },
  });

  // Elapsed time tracking
  const [operationStart, setOperationStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState(0);

  useEffect(() => {
    if (!operationStart) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - operationStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [operationStart]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  function finishOperation() {
    setFinalElapsed(operationStart ? Math.floor((Date.now() - operationStart) / 1000) : elapsed);
    setOperationStart(null);
  }

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      setOperationStart(Date.now());
      const resp = await api.post("/monitoring/admin/corpus/validate", {}, { timeout: 600000 });
      return resp.data;
    },
    onSuccess: () => {
      finishOperation();
      queryClient.invalidateQueries({ queryKey: ["corpus-stats"] });
      showToastMsg("Validation complete!", "success");
    },
    onError: () => {
      finishOperation();
      showToastMsg("Validation failed", "error");
    },
  });

  // Run tests mutation
  const runTestsMutation = useMutation({
    mutationFn: async () => {
      setOperationStart(Date.now());
      const resp = await api.post("/monitoring/admin/corpus/run-tests", {}, { timeout: 600000 });
      return resp.data;
    },
    onSuccess: () => {
      finishOperation();
      queryClient.invalidateQueries({ queryKey: ["corpus-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-qa-runs"] });
      showToastMsg("Tests complete!", "success");
    },
    onError: () => {
      finishOperation();
      showToastMsg("Tests failed", "error");
    },
  });

  const images = pendingData?.images ?? [];
  const currentImage = images[cursor];
  const remainingImages = images.length - cursor;

  // Toast
  const showToastMsg = useCallback((msg: string, type: "success" | "skip" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 1200);
  }, []);

  // Actions
  const accept = useCallback(() => {
    if (!currentImage || acceptMutation.isPending) return;
    acceptMutation.mutate(currentImage);
  }, [currentImage, acceptMutation]);

  const skip = useCallback(() => {
    if (!currentImage) return;
    setTotalSkipped((prev) => prev + 1);
    setStreak(0);
    setHistory((prev) => [...prev, { action: "skip", cursor }]);
    setCursor((prev) => prev + 1);
    showToastMsg("Skipped", "skip");
  }, [currentImage, cursor, showToastMsg]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCursor(last.cursor);
    if (last.action === "accept") {
      setLevelAccepted((prev) => Math.max(0, prev - 1));
      setTotalAccepted((prev) => Math.max(0, prev - 1));
    } else {
      setTotalSkipped((prev) => Math.max(0, prev - 1));
    }
    setStreak(0);
    showToastMsg("Undone", "skip");
  }, [history, showToastMsg]);

  function nextLevel() {
    setShowLevelComplete(false);
    setLevel((prev) => prev + 1);
    setLevelAccepted(0);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (showLevelComplete) {
        if (e.key === "Enter") nextLevel();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") accept();
      else if (e.key === "ArrowLeft" || e.key === "s" || e.key === "S") skip();
      else if (e.key === "z" || e.key === "Z") undo();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [accept, skip, undo, showLevelComplete]);

  // --- Render ---

  const progressPct = (levelAccepted / LEVEL_SIZE) * 100;
  const accuracyRate = totalAccepted + totalSkipped > 0
    ? Math.round((totalAccepted / (totalAccepted + totalSkipped)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Game HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Level Card */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Level</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-heading ${getLevelColor(level)}`}>{level}</span>
              <span className="text-sm text-muted-foreground">{getLevelTitle(level)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className={`border-l-4 ${streak >= 5 ? "border-l-amber-500" : "border-l-slate-300"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className={`h-4 w-4 ${streak >= 5 ? "text-amber-500" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Streak</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-heading ${streak >= 10 ? "text-amber-400" : streak >= 5 ? "text-amber-500" : ""}`}>
                {streak}
              </span>
              <span className="text-xs text-muted-foreground">best: {bestStreak}</span>
            </div>
          </CardContent>
        </Card>

        {/* Accepted Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accepted</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-heading">{totalAccepted}</span>
              <span className="text-xs text-muted-foreground">{accuracyRate}% rate</span>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Card */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Remaining</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-heading">{remainingImages}</span>
              <span className="text-xs text-muted-foreground">images</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                Level {level} Progress
              </span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {levelAccepted} / {LEVEL_SIZE}
            </span>
          </div>
          <Progress value={Math.min(100, progressPct)} className="h-3" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {LEVEL_SIZE - levelAccepted > 0
                ? `${LEVEL_SIZE - levelAccepted} more to level up`
                : "Level complete!"}
            </span>
            {streak >= 3 && (
              <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {streak}x streak!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Corpus Stats + Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Corpus Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Corpus Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-500">{stats?.validated ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Validated</div>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">{stats?.unvalidated ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-400">{stats?.rejected ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            )}
            {stats?.categories && Object.keys(stats.categories).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {Object.entries(stats.categories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <Badge key={cat} variant="outline" className="text-xs font-mono">
                      {cat}: {count}
                    </Badge>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Actions
            </CardTitle>
            <CardDescription>Run validation or QA tests on the corpus</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending || (stats?.unvalidated ?? 0) === 0}
              className="flex-1"
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4 mr-2" />
              )}
              Validate ({stats?.unvalidated ?? 0})
            </Button>
            <Button
              onClick={() => runTestsMutation.mutate()}
              disabled={runTestsMutation.isPending || (stats?.validated ?? 0) < 5}
              className="flex-1"
            >
              {runTestsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run QA Tests
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Operation progress — live pipeline stepper */}
      {operationStart && (
        <PipelineStepper
          steps={
            validateMutation.isPending
              ? getActiveStepByTime(VALIDATE_STEPS, elapsed, stats?.unvalidated ?? 0)
              : getActiveStepByTime(QA_STEPS, elapsed)
          }
          elapsed={elapsed}
          formatElapsed={formatElapsed}
          subtitle={
            validateMutation.isPending
              ? `~$0.03/image · ${stats?.unvalidated ?? 0} images to process`
              : "Creating bots, running 7 scenarios per restaurant, cleaning up..."
          }
        />
      )}

      {/* Completed pipeline — parsed stdout */}
      {!operationStart && (validateMutation.data || runTestsMutation.data) && (
        <CompletedPipeline
          steps={(() => {
            const data = runTestsMutation.data || validateMutation.data;
            const stdout = data?.stdout || "";
            if (runTestsMutation.data) return parseQAStdout(stdout);
            return parseValidateStdout(stdout, stats?.unvalidated ?? 0);
          })()}
          elapsed={finalElapsed}
          formatElapsed={formatElapsed}
          stdout={(runTestsMutation.data || validateMutation.data)?.stdout || ""}
          stderr={(runTestsMutation.data || validateMutation.data)?.stderr || ""}
        />
      )}

      {/* Level Complete Overlay */}
      {showLevelComplete && (
        <Card className="border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Trophy className="h-16 w-16 text-amber-500" />
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-heading font-bold text-emerald-500">
                Level {level} Complete!
              </h3>
              <p className="text-muted-foreground mt-2">
                {levelAccepted} menus accepted · {stats?.total ?? 0} total in corpus
              </p>
              {bestStreak > 0 && (
                <p className="text-sm text-amber-500 mt-1 flex items-center justify-center gap-1">
                  <Flame className="h-4 w-4" />
                  Best streak this session: {bestStreak}
                </p>
              )}
            </div>
            <p className={`text-sm font-medium ${getLevelColor(level + 1)}`}>
              Next: Level {level + 1} — {getLevelTitle(level + 1)}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={nextLevel} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Validate Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Classification Area */}
      {!showLevelComplete && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="min-h-[420px] flex flex-col items-center justify-center p-6">
              {loadingImages ? (
                <div className="space-y-4 w-full max-w-lg">
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-4 w-48 mx-auto" />
                </div>
              ) : !currentImage ? (
                <div className="text-center space-y-3">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground font-medium">No more images to classify</p>
                  <p className="text-xs text-muted-foreground">All available images have been reviewed</p>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImage.src}
                    alt={currentImage.alt || "Menu image"}
                    className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-md"
                    onError={() => {
                      setCursor((prev) => prev + 1);
                    }}
                  />
                  {currentImage.alt && (
                    <p className="text-xs text-muted-foreground text-center max-w-md mt-3">
                      {currentImage.alt}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Action Bar */}
            {currentImage && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-4 bg-muted/30">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={skip}
                    className="min-w-[140px] border-slate-300"
                  >
                    <XCircle className="h-5 w-5 mr-2 text-slate-500" />
                    Skip
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={undo}
                    disabled={history.length === 0}
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    Undo
                  </Button>

                  <Button
                    size="lg"
                    onClick={accept}
                    disabled={acceptMutation.isPending}
                    className="min-w-[160px] bg-emerald-600 hover:bg-emerald-700"
                  >
                    {acceptMutation.isPending ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                    )}
                    Accept
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Keyboard Shortcuts */}
      <div className="flex items-center justify-center gap-6 py-2">
        <Keyboard className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-[11px]">&larr;</kbd>
          <span>skip</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-[11px]">&rarr;</kbd>
          <span>accept</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-2 py-1 rounded border bg-muted font-mono text-[11px]">Z</kbd>
          <span>undo</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-3 rounded-lg font-bold text-lg shadow-2xl transition-opacity
            ${toast.type === "success" ? "bg-emerald-900/95 text-emerald-300 border border-emerald-700/50" : ""}
            ${toast.type === "skip" ? "bg-slate-900/95 text-slate-300 border border-slate-700/50" : ""}
            ${toast.type === "error" ? "bg-red-900/95 text-red-300 border border-red-700/50" : ""}
          `}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
