import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  /** Use full viewport height minus header (for kanban-style layouts) */
  fullHeight?: boolean;
  className?: string;
}

export function PageContainer({
  children,
  fullHeight = false,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "container mx-auto max-w-6xl space-y-8 animate-in fade-in duration-300",
        fullHeight && "flex flex-col h-[calc(100vh-130px)] min-h-[650px] space-y-2",
        className
      )}
    >
      {children}
    </div>
  );
}
