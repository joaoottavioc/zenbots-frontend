import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300",
        className
      )}
    >
      <div className="bg-white p-4 rounded-full shadow-sm inline-flex mb-4">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      {description && (
        <p className="text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && !description && <div className="mt-6">{action}</div>}
      {action && description && <div>{action}</div>}
    </div>
  );
}
