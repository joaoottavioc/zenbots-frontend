"use client";

import React from "react";
import { BotSelector } from "@/components/ui/bot-selector";
import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
  title: string;
  description?: string;
  selectedBotId?: string | null;
  onBotChange?: (id: string) => void;
  /** Optional element rendered next to the title (e.g. Online/Offline badge) */
  titleSuffix?: React.ReactNode;
  /** Action buttons rendered on the right side */
  children?: React.ReactNode;
  /** Hide the bottom separator (default: false) */
  hideSeparator?: boolean;
}

export function PageHeader({
  title,
  description,
  selectedBotId,
  onBotChange,
  titleSuffix,
  children,
  hideSeparator = false,
}: PageHeaderProps) {
  const showBotSelector = !!onBotChange;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Left: Title + suffix + description */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            {titleSuffix && <div className="mt-1">{titleSuffix}</div>}
          </div>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* Right: Action buttons + bot selector */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full md:w-auto">
          {children && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {children}
              {showBotSelector && (
                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
              )}
            </div>
          )}

          {showBotSelector && (
            <BotSelector
              selectedBotId={selectedBotId ?? null}
              onBotChange={onBotChange}
            />
          )}
        </div>
      </div>

      {!hideSeparator && <Separator />}
    </div>
  );
}
