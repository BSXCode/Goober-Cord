"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { Search, UserPlus, Check, X, MessageSquare } from "lucide-react";
import { getSocket } from "@/lib/socket";

export function FriendsList() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const dmChannels = useAppStore((s) => s.dmChannels);
  const setSelectedDM = useAppStore((s) => s.setSelectedDM);
  const getOrCreateDM = useAppStore((s) => s.getOrCreateDM);
  const [search, setSearch] = useState("");

  const currentUser = currentUserId ? users[currentUserId] : null;
  const pendingRequests = currentUser?.friendRequests ?? [];
  const friendIds = currentUser?.friends ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return friendIds
      .map((id) => users[id])
      .filter(Boolean)
      .filter((u) => !q || u.username.toLowerCase().includes(q));
  }, [friendIds, users, search]);

  const handleOpenDM = useCallback((userId: string) => {
    if (!currentUserId) return;
    const dmId = getOrCreateDM(userId, currentUserId);
    setSelectedDM(dmId);
  }, [currentUserId, getOrCreateDM, setSelectedDM]);

  const handleAccept = useCallback((fromUserId: string) => {
    if (!currentUserId) return;
    const sock = getSocket();
    sock?.emit("friend:accept", { userId: currentUserId, fromUserId }, () => {});
  }, [currentUserId]);

  const handleDecline = useCallback((fromUserId: string) => {
    if (!currentUserId) return;
    const sock = getSocket();
    sock?.emit("friend:decline", { userId: currentUserId, fromUserId }, () => {});
  }, [currentUserId]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-2 py-2 border-b border-[#3f4147]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4e5058]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends by name..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-2">
        {pendingRequests.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-[#faa61a] uppercase tracking-wider px-1 mb-1.5">
              Pending Requests — {pendingRequests.length}
            </p>
            {pendingRequests.map((req) => {
              const sender = users[req.fromUserId];
              if (!sender) return null;
              return (
                <div
                  key={req.fromUserId}
                  className="flex items-center gap-2 px-2 py-2 rounded bg-[#faa61a]/5 border border-[#faa61a]/20 mb-1 animate-slide-up"
                >
                  <div className="w-8 h-8 rounded-full bg-[#5865f2] flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-sm font-medium">
                    {sender.avatar ? (
                      <img src={sender.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      sender.username.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{sender.username}</p>
                    <p className="text-[10px] text-[#949ba4]">Wants to be your friend</p>
                  </div>
                  <button
                    onClick={() => handleAccept(req.fromUserId)}
                    className="p-1.5 rounded-lg bg-[#23a559] text-white hover:bg-[#1a8f4a] transition-colors"
                    title="Accept"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDecline(req.fromUserId)}
                    className="p-1.5 rounded-lg bg-[#3f4147] text-[#949ba4] hover:text-white hover:bg-[#4e5058] transition-colors"
                    title="Decline"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {friendIds.length > 0 && (
          <p className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider px-1 mb-1.5">
            Friends — {filtered.length}
          </p>
        )}

        {filtered.length === 0 && pendingRequests.length === 0 ? (
          <p className="text-sm text-[#949ba4] py-4 text-center">
            {search.trim() ? "No friends match your search." : "No friends yet. Send friend requests from profiles!"}
          </p>
        ) : filtered.length === 0 && friendIds.length > 0 ? (
          <p className="text-sm text-[#949ba4] py-2 text-center">No friends match your search.</p>
        ) : (
          filtered.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleOpenDM(user.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-[#3f4147] text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#5865f2] flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-sm font-medium">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.username.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.username}</p>
                <p className="text-xs text-[#949ba4]">#{user.discriminator}</p>
              </div>
              <MessageSquare className="w-4 h-4 text-[#b5bac1] flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
