"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Undo2,
  Play,
  FlaskConical,
  ImageIcon,
  Loader2,
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

// --- Constants ---

const LEVEL_SIZE = 30;
const BATCH_SIZE = 100;

// --- Component ---

export function CorpusGamePanel() {
  const queryClient = useQueryClient();

  // State
  const [cursor, setCursor] = useState(0);
  const [levelAccepted, setLevelAccepted] = useState(0);
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [level, setLevel] = useState(1);
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
      setLevelAccepted((prev) => prev + 1);
      setHistory((prev) => [...prev, { action: "accept", cursor }]);
      showToast(`#${data.total} saved (${data.size_kb}KB)`, "success");
      setCursor((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["corpus-stats"] });
    },
    onError: () => {
      // Download failed — silently skip
      showToast("Download failed, next...", "skip");
      setCursor((prev) => prev + 1);
    },
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post("/monitoring/admin/corpus/validate", {}, { timeout: 600000 });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corpus-stats"] });
      showToast("Validation complete!", "success");
    },
    onError: () => showToast("Validation failed", "error"),
  });

  // Run tests mutation
  const runTestsMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post("/monitoring/admin/corpus/run-tests", {}, { timeout: 600000 });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corpus-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-qa-runs"] });
      showToast("Tests complete!", "success");
    },
    onError: () => showToast("Tests failed", "error"),
  });

  const images = pendingData?.images ?? [];
  const currentImage = images[cursor];

  // Toast
  function showToast(msg: string, type: "success" | "skip" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 1200);
  }

  // Actions
  const accept = useCallback(() => {
    if (!currentImage || acceptMutation.isPending) return;
    acceptMutation.mutate(currentImage);
  }, [currentImage, acceptMutation]);

  const skip = useCallback(() => {
    if (!currentImage) return;
    setTotalSkipped((prev) => prev + 1);
    setHistory((prev) => [...prev, { action: "skip", cursor }]);
    setCursor((prev) => prev + 1);
    showToast("Skipped", "skip");
  }, [currentImage, cursor]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCursor(last.cursor);
    if (last.action === "accept") {
      setLevelAccepted((prev) => Math.max(0, prev - 1));
    } else {
      setTotalSkipped((prev) => Math.max(0, prev - 1));
    }
    showToast("Undone", "skip");
  }, [history]);

  // Level check
  useEffect(() => {
    if (levelAccepted >= LEVEL_SIZE && !showLevelComplete) {
      setShowLevelComplete(true);
    }
  }, [levelAccepted, showLevelComplete]);

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

  return (
    <div className="space-y-4">
      {/* Stats + Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Corpus Stats Card */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Corpus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-2xl font-bold text-green-500">{stats?.validated ?? 0}</span>
                  <span className="text-muted-foreground ml-1">validated</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-yellow-500">{stats?.unvalidated ?? 0}</span>
                  <span className="text-muted-foreground ml-1">pending</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-muted-foreground">{stats?.rejected ?? 0}</span>
                  <span className="text-muted-foreground ml-1">rejected</span>
                </div>
              </div>
            )}
            {stats?.categories && Object.keys(stats.categories).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(stats.categories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {cat}: {count}
                    </Badge>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending || (stats?.unvalidated ?? 0) === 0}
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4 mr-1" />
              )}
              Validate ({stats?.unvalidated ?? 0})
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => runTestsMutation.mutate()}
              disabled={runTestsMutation.isPending || (stats?.validated ?? 0) < 5}
            >
              {runTestsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Run QA Tests
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Validation / Test output */}
      {(validateMutation.data || runTestsMutation.data) && (
        <Card>
          <CardContent className="p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-muted-foreground">
              {validateMutation.data?.stdout || runTestsMutation.data?.stdout || ""}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Level Progress */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary">Level {level}</Badge>
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {levelAccepted}/{LEVEL_SIZE} accepted
        </span>
        <span className="text-sm text-muted-foreground">
          {totalSkipped} skipped
        </span>
      </div>

      {/* Level Complete Overlay */}
      {showLevelComplete && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="text-2xl font-bold text-green-500">
              Level {level} Complete!
            </h3>
            <p className="text-muted-foreground">
              {levelAccepted} menus saved · {stats?.total ?? 0} total in corpus
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={nextLevel}>Next Level →</Button>
              <Button
                variant="outline"
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
              >
                <FlaskConical className="h-4 w-4 mr-1" />
                Validate Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Display */}
      {!showLevelComplete && (
        <Card className="min-h-[400px] flex items-center justify-center">
          <CardContent className="p-4 flex flex-col items-center gap-4 w-full">
            {loadingImages ? (
              <Skeleton className="h-64 w-full max-w-lg" />
            ) : !currentImage ? (
              <p className="text-muted-foreground">No more images to classify.</p>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage.src}
                  alt={currentImage.alt || "Menu image"}
                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    // Broken image — auto skip
                    setCursor((prev) => prev + 1);
                  }}
                />
                {currentImage.alt && (
                  <p className="text-xs text-muted-foreground text-center max-w-md">
                    {currentImage.alt}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!showLevelComplete && currentImage && (
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={skip}
            className="min-w-[140px]"
          >
            <XCircle className="h-5 w-5 mr-2" />
            Skip (←)
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={accept}
            disabled={acceptMutation.isPending}
            className="min-w-[180px] bg-green-600 hover:bg-green-700"
          >
            {acceptMutation.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mr-2" />
            )}
            Real Menu (→)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={history.length === 0}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo (Z)
          </Button>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <p className="text-xs text-center text-muted-foreground">
        ← or S = skip · → or Enter = accept · Z = undo
      </p>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-3 rounded-lg font-bold text-lg transition-opacity
            ${toast.type === "success" ? "bg-green-900/90 text-green-400" : ""}
            ${toast.type === "skip" ? "bg-neutral-900/90 text-neutral-400" : ""}
            ${toast.type === "error" ? "bg-red-900/90 text-red-400" : ""}
          `}
        >
          {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "⏭"} {toast.msg}
        </div>
      )}
    </div>
  );
}
