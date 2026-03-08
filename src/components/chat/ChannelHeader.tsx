"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { Hash, Users, Bell, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  onNotifications,
  getNotifications,
  dismissNotification,
  type AppNotification,
} from "@/lib/notifications";

interface ChannelHeaderProps {
  channelId: string;
  isDM: boolean;
}

export function ChannelHeader({ channelId, isDM }: ChannelHeaderProps) {
  const channels = useAppStore((s) => s.channels);
  const dmChannels = useAppStore((s) => s.dmChannels);
  const users = useAppStore((s) => s.users);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const toggleMemberList = useAppStore((s) => s.toggleMemberList);
  const memberListOpen = useAppStore((s) => s.memberListOpen);

  const [panelOpen, setPanelOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [seenCount, setSeenCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifs(getNotifications());
    return onNotifications((n) => setNotifs(n));
  }, []);

  useEffect(() => {
    if (panelOpen) setSeenCount(notifs.length);
  }, [panelOpen, notifs.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  const unseenCount = Math.max(0, notifs.length - seenCount);

  const channel = isDM ? dmChannels[channelId] : channels[channelId];
  if (!channel) return null;

  const name = isDM && "participantIds" in channel
    ? (() => {
        const otherId = channel.participantIds.find((id) => id !== currentUserId);
        const other = otherId ? users[otherId] : null;
        return other ? `${other.username}#${other.discriminator}` : "DM";
      })()
    : "name" in channel
      ? channel.name
      : "Channel";

  const typeIcon = (t: AppNotification["type"]) => {
    switch (t) {
      case "mention": return "💬";
      case "dm": return "✉️";
      case "friend_request": return "👋";
      default: return "🔔";
    }
  };

  return (
    <header className="h-12 flex-shrink-0 px-4 flex items-center justify-between border-b border-[var(--glass-border)] bg-transparent">
      <div className="flex items-center gap-2 min-w-0">
        <Hash className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
        <span className="font-semibold text-[var(--text)] truncate">{name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleMemberList}
          className={cn(
            "p-2 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]",
            memberListOpen && "text-[var(--text)] bg-[var(--channel-hover)]"
          )}
          aria-label="Toggle member list"
        >
          <Users className="w-5 h-5" />
        </button>
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen((p) => !p)}
            className={cn(
              "p-2 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)] relative",
              panelOpen && "text-[var(--text)] bg-[var(--channel-hover)]"
            )}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unseenCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unseenCount > 9 ? "9+" : unseenCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-[var(--surface-elevated)] border border-[var(--glass-border)] rounded-xl shadow-xl overflow-hidden z-50 animate-pop-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
                <h3 className="text-sm font-semibold text-[var(--text)]">Notifications</h3>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-80 scroll-thin">
                {notifs.length === 0 ? (
                  <div className="py-10 text-center text-[var(--text-muted)] text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No notifications yet
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--channel-hover)] border-b border-[var(--glass-border)] last:border-b-0 group"
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{n.icon ?? typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{n.title}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{n.body}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 opacity-60">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
