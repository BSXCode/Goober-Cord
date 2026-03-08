"use client";

import { useToastStore } from "@/lib/toast";
import { cn } from "@/lib/cn";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            "px-4 py-3 rounded-lg shadow-lg border flex items-center justify-between gap-4",
            t.type === "error" && "bg-red-900/90 border-red-700 text-red-100",
            t.type === "success" && "bg-green-900/90 border-green-700 text-green-100",
            t.type === "reconnect" && "bg-[#5865f2]/90 border-[#4752c4] text-white",
            (t.type === "info" || !t.type) && "bg-[#2b2d31] border-[#3f4147] text-[#f2f3f5]"
          )}
        >
          <span className="text-sm">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-current opacity-70 hover:opacity-100 p-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
