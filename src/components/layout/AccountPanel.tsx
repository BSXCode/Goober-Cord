"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { Settings, Pencil, LogOut } from "lucide-react";
import { ProfileEditWidget } from "./ProfileEditWidget";

export function AccountPanel() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const logout = useAuthStore((s) => s.logout);
  const users = useAppStore((s) => s.users);
  const presence = useAppStore((s) => s.presence);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const [showProfile, setShowProfile] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const user = currentUserId ? users[currentUserId] : null;
  if (!user) return null;

  const status = presence[user.id]?.status ?? user.presence ?? "offline";
  const customStatus = presence[user.id]?.customStatus ?? user.customStatus;

  return (
    <>
      <div className="flex flex-shrink-0 items-center gap-2 px-2 py-2 bg-[var(--glass-bg)] backdrop-blur-sm rounded-xl mx-2 mb-2 mt-1 min-h-[52px] border border-[var(--glass-border)] shadow-sm">
        <button
          ref={profileButtonRef}
          type="button"
          onClick={() => setShowProfile(true)}
          className="flex flex-1 items-center gap-2 min-w-0 rounded hover:bg-[var(--channel-hover)] p-1 -m-1 transition-colors"
          aria-label="Open profile"
        >
          <div className="relative w-8 h-8 rounded-full bg-[#5865f2] flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-sm font-medium">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user.username.slice(0, 1).toUpperCase()
            )}
            <span
              className={cn(
                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--surface)]",
                status === "online" && "bg-[#23a559]",
                status === "idle" && "bg-[#faa61a]",
                status === "dnd" && "bg-[#f23f42]",
                status === "offline" && "bg-[#80848e]"
              )}
            />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-[var(--text)] truncate">{user.username}</p>
            {customStatus ? (
              <p className="text-xs text-[var(--text-muted)] truncate">{customStatus}</p>
            ) : (
              <p className="text-xs text-[var(--text-muted)] capitalize">{status}</p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => {
              setSettingsOpen(true);
            }}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]"
            aria-label="Edit Profile"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--channel-hover)]"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <ProfileEditWidget
        open={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
}
