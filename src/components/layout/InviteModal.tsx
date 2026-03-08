"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { X, Check, Search, Users } from "lucide-react";
import type { ServerInvite } from "@/lib/types";

interface InviteModalProps {
  serverId: string;
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ serverId, open, onClose }: InviteModalProps) {
  const users = useAppStore((s) => s.users);
  const members = useAppStore((s) => s.members);
  const servers = useAppStore((s) => s.servers);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const getOrCreateDM = useAppStore((s) => s.getOrCreateDM);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const server = servers[serverId];

  const serverMemberUserIds = useMemo(
    () => new Set(Object.values(members).filter((m) => m.serverId === serverId).map((m) => m.userId)),
    [members, serverId]
  );

  const memberCount = serverMemberUserIds.size;

  const invitableUsers = useMemo(() => {
    return Object.values(users).filter((u) => {
      if (u.id === currentUserId) return false;
      if (serverMemberUserIds.has(u.id)) return false;
      if (search && !u.username.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [users, currentUserId, serverMemberUserIds, search]);

  const handleInvite = (userId: string) => {
    if (!currentUserId || !server) return;
    const dmId = getOrCreateDM(userId, currentUserId);

    const invite: ServerInvite = {
      serverId,
      serverName: server.name,
      serverIcon: server.icon,
      serverBanner: server.banner,
      memberCount,
    };

    sendMessage(currentUserId, dmId, `You've been invited to join **${server.name}**!`, {
      invite,
    } as any);

    setInvited((prev) => new Set(prev).add(userId));
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#313338] rounded-xl shadow-2xl border border-[#3f4147] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Server preview */}
        <div className="relative">
          <div className="h-20 bg-gradient-to-r from-[#5865f2] to-[#eb459e] overflow-hidden">
            {server?.banner && (
              <img src={server.banner} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="absolute -bottom-5 left-4">
            <div className="w-10 h-10 rounded-xl bg-[#313338] border-2 border-[#313338] overflow-hidden flex items-center justify-center">
              {server?.icon ? (
                <img src={server.icon} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-bold bg-[#5865f2] w-full h-full flex items-center justify-center">
                  {server?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-7 px-4 pb-2">
          <h2 className="text-lg font-semibold text-white">{server?.name}</h2>
          <div className="flex items-center gap-1.5 text-xs text-[#949ba4] mt-0.5">
            <Users className="w-3 h-3" />
            <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="border-t border-[#3f4147] mx-4 my-2" />

        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-2">Send invite to</p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#949ba4] text-sm focus:outline-none focus:border-[#5865f2]"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {invitableUsers.length === 0 && (
              <p className="text-sm text-[#949ba4] text-center py-4">
                {search ? "No users found" : "No users to invite"}
              </p>
            )}
            {invitableUsers.map((user) => {
              const alreadyInvited = invited.has(user.id);
              return (
                <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#3f4147]">
                  <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.username.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span className="flex-1 text-sm text-white truncate">
                    {user.username}
                    <span className="text-[#949ba4]">#{user.discriminator}</span>
                  </span>
                  <button
                    onClick={() => handleInvite(user.id)}
                    disabled={alreadyInvited}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-medium transition-colors",
                      alreadyInvited
                        ? "bg-[#23a559] text-white cursor-default"
                        : "bg-[#5865f2] text-white hover:bg-[#4752c4]"
                    )}
                  >
                    {alreadyInvited ? (
                      <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Sent</span>
                    ) : (
                      "Invite"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end px-4 py-3 border-t border-[#3f4147]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#b5bac1] hover:text-white hover:bg-[#3f4147]">
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
