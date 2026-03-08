"use client";

import { useMemo, useState, useRef } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { Mic, MicOff } from "lucide-react";
import { UserProfilePopover } from "./UserProfilePopover";

export function MemberList() {
  const selectedServerId = useAppStore((s) => s.selectedServerId);
  const selectedDMId = useAppStore((s) => s.selectedDMId);
  const members = useAppStore((s) => s.members);
  const users = useAppStore((s) => s.users);
  const voiceStates = useAppStore((s) => s.voiceStates);
  const presence = useAppStore((s) => s.presence);
  const typing = useAppStore((s) => s.typing);
  const selectedChannelId = useAppStore((s) => s.selectedChannelId);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const profileAnchorRef = useRef<HTMLDivElement | null>(null);

  const serverMembers = useMemo(() => {
    if (!selectedServerId) return [];
    const seen = new Set<string>();
    return Object.values(members).filter((m) => {
      if (m.serverId !== selectedServerId) return false;
      if (seen.has(m.userId)) return false;
      seen.add(m.userId);
      return true;
    });
  }, [members, selectedServerId]);

  if (selectedDMId) return null;

  const getStatus = (userId: string) => {
    const pre = presence[userId];
    const vs = voiceStates[userId];
    if (vs?.channelId) return "voice";
    return pre?.status ?? "offline";
  };

  const profileUser = profileUserId ? users[profileUserId] : null;

  return (
    <div className="w-60 flex-shrink-0 flex flex-col bg-[var(--glass-bg)] backdrop-blur-md border-l border-[var(--glass-border)]">
      <div className="h-12 px-4 flex items-center border-b border-[var(--glass-border)]">
        <span className="font-semibold text-[var(--text)]">
          Members — {serverMembers.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-2 relative">
        {serverMembers.map((member) => {
          const user = users[member.userId];
          if (!user) return null;
          const name = member.nickname ?? user.username;
          const status = getStatus(member.userId);
          const isInVoice = !!voiceStates[member.userId]?.channelId;
          const isTyping = selectedChannelId ? typing.get(selectedChannelId)?.has(member.userId) : false;
          const isSelected = profileUserId === member.userId;

          return (
            <div
              key={member.id}
              ref={isSelected ? profileAnchorRef : undefined}
              role="button"
              tabIndex={0}
              onClick={() => setProfileUserId((id) => (id === member.userId ? null : member.userId))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setProfileUserId((id) => (id === member.userId ? null : member.userId));
                }
              }}
              className={cn(
                "relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[#3f4147] group",
                isSelected && "bg-[#3f4147]"
              )}
            >
              <div className="relative flex-shrink-0 w-8 h-8">
                <div
                  className={cn(
                    "w-full h-full rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden",
                    "bg-[#5865f2]"
                  )}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    name.slice(0, 1).toUpperCase()
                  )}
                </div>
                {status !== "offline" && (
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2b2d31]",
                      status === "online" && "bg-[#23a559]",
                      status === "idle" && "bg-[#f0b232]",
                      status === "dnd" && "bg-[#f23f42]",
                      status === "voice" && "bg-[#23a559]"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "text-sm truncate",
                      user.nameplate === "glow" && "drop-shadow-[0_0_6px_currentColor]",
                      user.nameplate === "outlined" && "[text-shadow:_-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]",
                      user.nameplate === "rainbow" && "animate-rainbow-text bg-clip-text text-transparent bg-[length:200%_auto] bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500",
                      user.nameplate === "gradient" && "bg-clip-text text-transparent bg-gradient-to-r from-[#5865f2] to-[#eb459e]",
                    )}
                    style={user.nameplate !== "rainbow" && user.nameplate !== "gradient" ? { color: user.nameColor || "#f2f3f5" } : undefined}
                  >
                    {name}
                    {member.userId === currentUserId && " (you)"}
                  </span>
                  {isInVoice && (
                    voiceStates[member.userId]?.muted ? (
                      <MicOff className="w-3.5 h-3.5 text-[#f23f42] flex-shrink-0" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-[#23a559] flex-shrink-0" />
                    )
                  )}
                </div>
                {isTyping && (
                  <p className="text-xs text-[#949ba4] italic">typing...</p>
                )}
              </div>
            </div>
          );
        })}
        {profileUser && (
          <UserProfilePopover
            user={profileUser}
            anchorRef={profileAnchorRef}
            onClose={() => setProfileUserId(null)}
            position="left"
          />
        )}
      </div>
    </div>
  );
}
