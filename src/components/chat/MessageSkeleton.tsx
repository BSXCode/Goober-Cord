"use client";

import { cn } from "@/lib/cn";

export function MessageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-4 py-2", className)}>
      <div className="w-10 h-10 rounded-full bg-[#2e3035] flex-shrink-0 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-[#2e3035] rounded animate-pulse" />
        <div className="h-4 w-full max-w-md bg-[#2e3035] rounded animate-pulse" />
        <div className="h-4 w-3/4 max-w-sm bg-[#2e3035] rounded animate-pulse" />
      </div>
    </div>
  );
}
