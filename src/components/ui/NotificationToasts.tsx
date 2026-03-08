"use client";

import { useState, useEffect } from "react";
import { onNotifications, dismissNotification, type AppNotification } from "@/lib/notifications";
import { cn } from "@/lib/cn";
import { X, MessageSquare, AtSign, UserPlus, Info } from "lucide-react";

const ICONS = {
  mention: AtSign,
  dm: MessageSquare,
  friend_request: UserPlus,
  info: Info,
};

const COLORS = {
  mention: "#5865f2",
  dm: "#23a559",
  friend_request: "#faa61a",
  info: "#949ba4",
};

export function NotificationToasts() {
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  useEffect(() => {
    return onNotifications(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none" style={{ maxWidth: 340 }}>
      {toasts.slice(0, 5).map((t) => {
        const Icon = ICONS[t.type] ?? Info;
        const color = COLORS[t.type] ?? "#949ba4";
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl bg-[#1e1f22] border border-[#3f4147] shadow-2xl animate-slide-in-right"
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.icon ? (
                <img src={t.icon} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: color + "20" }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{t.title}</p>
              <p className="text-xs text-[#949ba4] line-clamp-2">{t.body}</p>
            </div>
            <button
              onClick={() => dismissNotification(t.id)}
              className="flex-shrink-0 p-1 text-[#949ba4] hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
