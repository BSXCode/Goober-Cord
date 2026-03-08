"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { Search, UserPlus } from "lucide-react";

export function SocialTab() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const dmChannels = useAppStore((s) => s.dmChannels);
  const setSelectedDM = useAppStore((s) => s.setSelectedDM);
  const getOrCreateDM = useAppStore((s) => s.getOrCreateDM);
  const [search, setSearch] = useState("");

  // Users we already have DMs with
  const existingFriendIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    const ids = new Set<string>();
    Object.values(dmChannels).forEach((dm) => {
      if (dm.participantIds.includes(currentUserId)) {
        dm.participantIds.forEach((id) => {
          if (id !== currentUserId) ids.add(id);
        });
      }
    });
    return ids;
  }, [currentUserId, dmChannels]);

  // Only show users that match the search (must type to see anyone)
  const availableUsers = useMemo(() => {
    if (!currentUserId) return [];
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return Object.values(users)
      .filter((u) => u.id !== currentUserId && !existingFriendIds.has(u.id))
      .filter((u) => u.username.toLowerCase().includes(q) || u.discriminator.includes(q))
      .slice(0, 20);
  }, [users, currentUserId, existingFriendIds, search]);

  const handleAddFriend = (userId: string) => {
    if (!currentUserId) return;
    const dmId = getOrCreateDM(userId, currentUserId);
    setSelectedDM(dmId);
    setSearch("");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-2 py-2 border-b border-[#3f4147]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4e5058]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users to add as friends..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-2">
        {availableUsers.length === 0 ? (
          <p className="text-sm text-[#949ba4] py-4 text-center">
            {search.trim() ? "No users found matching your search." : "Search for users by username to add them as friends."}
          </p>
        ) : (
          availableUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleAddFriend(user.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-[#3f4147] text-left"
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
              <UserPlus className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
