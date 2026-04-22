"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PlanAccent = "slate" | "cyan" | "amber" | "emerald";

export interface PlanCardProps {
  title: string;
  description?: string;
  priceLabel: string;
  priceSublabel?: string;
  features: string[];
  accent?: PlanAccent;
  badge?: string;
  highlight?: boolean;
  scarcity?: string;
  savingsHint?: string;
  isCurrent?: boolean;
  ctaLabel: string;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
  muted?: boolean;
}

const ACCENTS: Record<PlanAccent, {
  ring: string;
  iconWrap: string;
  badge: string;
  title: string;
  cta: string;
  check: string;
  scarcity: string;
}> = {
  slate: {
    ring: "border-slate-300 ring-slate-200",
    iconWrap: "bg-slate-100 text-slate-600",
    badge: "bg-slate-500",
    title: "text-slate-900",
    cta: "bg-slate-900 hover:bg-slate-800 text-white",
    check: "text-slate-500",
    scarcity: "bg-slate-50 border-slate-200 text-slate-700",
  },
  cyan: {
    ring: "border-cyan-300 ring-cyan-200",
    iconWrap: "bg-cyan-100 text-cyan-700",
    badge: "bg-cyan-500",
    title: "text-slate-900",
    cta: "bg-cyan-600 hover:bg-cyan-700 text-white",
    check: "text-emerald-600",
    scarcity: "bg-cyan-50 border-cyan-200 text-cyan-800",
  },
  amber: {
    ring: "border-amber-300 ring-amber-200",
    iconWrap: "bg-amber-100 text-amber-700",
    badge: "bg-amber-500",
    title: "text-slate-900",
    cta: "bg-amber-600 hover:bg-amber-700 text-white",
    check: "text-emerald-600",
    scarcity: "bg-amber-50 border-amber-200 text-amber-800",
  },
  emerald: {
    ring: "border-emerald-300 ring-emerald-200",
    iconWrap: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-500",
    title: "text-slate-900",
    cta: "bg-emerald-600 hover:bg-emerald-700 text-white",
    check: "text-emerald-600",
    scarcity: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
};

const DEFAULT_ICON: Record<PlanAccent, LucideIcon> = {
  slate: Sparkles,
  cyan: Zap,
  amber: Crown,
  emerald: Zap,
};

export function PlanCard({
  title,
  description,
  priceLabel,
  priceSublabel,
  features,
  accent = "slate",
  badge,
  highlight,
  scarcity,
  savingsHint,
  isCurrent,
  ctaLabel,
  ctaLoading,
  ctaDisabled,
  onSelect,
  icon,
  muted,
}: PlanCardProps) {
  const palette = ACCENTS[accent];
  const Icon = icon ?? DEFAULT_ICON[accent];
  const displayBadge = isCurrent ? "Plano atual" : badge;
  const ring = isCurrent || highlight;

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-shadow",
        ring && "ring-2 shadow-md",
        ring && palette.ring,
        muted && "opacity-90",
      )}
    >
      {displayBadge && (
        <div
          className={cn(
            "absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
            isCurrent ? "bg-slate-900" : palette.badge,
          )}
        >
          {displayBadge}
        </div>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", palette.iconWrap)}>
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className={cn("text-base", palette.title)}>{title}</CardTitle>
        </div>
        {description && <CardDescription className="pt-1">{description}</CardDescription>}
        <div className="pt-2">
          <span className="text-2xl font-bold text-slate-900">{priceLabel}</span>
          {priceSublabel && <div className="mt-0.5 text-xs text-slate-500">{priceSublabel}</div>}
        </div>
        {savingsHint && (
          <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {savingsHint}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className={cn("mt-0.5 h-4 w-4 shrink-0", palette.check)} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {scarcity && (
          <div className={cn("rounded border px-2 py-1 text-xs font-medium", palette.scarcity)}>
            {scarcity}
          </div>
        )}

        <div className="mt-auto pt-2">
          <Button
            onClick={onSelect}
            disabled={ctaDisabled || isCurrent || ctaLoading}
            className={cn("w-full", !isCurrent && palette.cta)}
            variant={isCurrent ? "outline" : undefined}
          >
            {ctaLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCurrent ? (
              "Plano atual"
            ) : (
              ctaLabel
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
