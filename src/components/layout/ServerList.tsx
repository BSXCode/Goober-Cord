"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { MessageCircle, Plus } from "lucide-react";
import { CreateServerModal } from "./CreateServerModal";

export function ServerList() {
  const servers = useAppStore((s) => s.servers);
  const members = useAppStore((s) => s.members);
  const channels = useAppStore((s) => s.channels);
  const messages = useAppStore((s) => s.messages);
  const readStates = useAppStore((s) => s.readStates);
  const users = useAppStore((s) => s.users);
  const dmChannels = useAppStore((s) => s.dmChannels);
  const selectedServerId = useAppStore((s) => s.selectedServerId);
  const selectedDMId = useAppStore((s) => s.selectedDMId);
  const setSelectedServer = useAppStore((s) => s.setSelectedServer);
  const setSelectedDM = useAppStore((s) => s.setSelectedDM);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const [showCreate, setShowCreate] = useState(false);

  const myServerIds = new Set(
    Object.values(members)
      .filter((m) => m.userId === currentUserId)
      .map((m) => m.serverId)
  );
  const serverList = Object.values(servers).filter((s) => myServerIds.has(s.id));
  const dmList = Object.values(dmChannels).filter((dm) => dm.participantIds.includes(currentUserId ?? ""));
  const isTopBubbleActive = !selectedServerId && !selectedDMId;

  const dmUnreadInfo = useMemo(() => {
    if (!currentUserId) return { total: 0, senders: [] as string[] };
    let total = 0;
    const senderSet = new Set<string>();
    for (const dm of dmList) {
      const readKey = `${dm.id}-${currentUserId}`;
      const lastRead = readStates[readKey]?.lastReadAt ?? 0;
      const unread = Object.values(messages).filter(
        (m) => m.channelId === dm.id && m.authorId !== currentUserId && m.createdAt > lastRead
      );
      total += unread.length;
      unread.forEach((m) => senderSet.add(m.authorId));
    }
    const senders = Array.from(senderSet).map((id) => users[id]?.username ?? "Someone");
    return { total, senders };
  }, [dmList, messages, readStates, currentUserId, users]);

  const serverMentionCounts = useMemo(() => {
    if (!currentUserId) return {};
    const counts: Record<string, number> = {};
    for (const sv of serverList) {
      const svChannelIds = new Set(
        Object.values(channels).filter((c) => c.serverId === sv.id).map((c) => c.id)
      );
      let count = 0;
      for (const msg of Object.values(messages)) {
        if (!svChannelIds.has(msg.channelId)) continue;
        if (msg.authorId === currentUserId) continue;
        const readKey = `${msg.channelId}-${currentUserId}`;
        const lastRead = readStates[readKey]?.lastReadAt ?? 0;
        if (msg.createdAt <= lastRead) continue;
        if (msg.content.includes(`<@${currentUserId}>`)) {
          count++;
        }
      }
      if (count > 0) counts[sv.id] = count;
    }
    return counts;
  }, [serverList, channels, messages, readStates, currentUserId]);

  return (
    <>
      <div className="flex-1 flex flex-col items-center py-3 min-h-0 overflow-y-auto">
        <div className="relative mb-2">
          <button
            onClick={() => {
              setSelectedServer(null);
              setSelectedDM(null);
            }}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              isTopBubbleActive
                ? "bg-[var(--accent)] text-white rounded-[50%]"
                : "text-[var(--text)] hover:bg-[var(--accent)] hover:text-white hover:rounded-[50%]"
            )}
            title="Friends, Social & DMs"
            aria-label="Friends, Social & DMs"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
          {dmUnreadInfo.total > 0 && (
            <span
              className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#f23f42] text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-[#1e1f22]"
              title={`From: ${dmUnreadInfo.senders.join(", ")}`}
            >
              {dmUnreadInfo.total > 99 ? "99+" : dmUnreadInfo.total}
            </span>
          )}
        </div>

        <div className="w-8 h-0.5 bg-[var(--glass-border)] rounded-full my-1" />

        {serverList.map((server) => {
          const mentionCount = serverMentionCounts[server.id] ?? 0;
          const hasUnread = (() => {
            const svChannelIds = new Set(
              Object.values(channels).filter((c) => c.serverId === server.id).map((c) => c.id)
            );
            for (const msg of Object.values(messages)) {
              if (!svChannelIds.has(msg.channelId)) continue;
              if (msg.authorId === currentUserId) continue;
              const readKey = `${msg.channelId}-${currentUserId}`;
              const lastRead = readStates[readKey]?.lastReadAt ?? 0;
              if (msg.createdAt > lastRead) return true;
            }
            return false;
          })();

          return (
            <div key={server.id} className="relative mb-2 group">
              <div className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200",
                selectedServerId === server.id ? "h-8" : hasUnread ? "h-2 group-hover:h-4" : "h-0 group-hover:h-4"
              )} />
              <button
                onClick={() => {
                  setSelectedServer(server.id);
                  // Auto-select first text channel
                  const serverChannels = Object.values(channels)
                    .filter(c => c.serverId === server.id && c.type === "text")
                    .sort((a, b) => a.position - b.position);
                  if (serverChannels.length > 0) {
                    useAppStore.getState().setSelectedChannel(serverChannels[0].id);
                  }
                }}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all overflow-hidden ml-3",
                  selectedServerId === server.id
                    ? "bg-[var(--accent)] text-white rounded-[30%]"
                    : "text-[var(--text)] hover:bg-[var(--accent)] hover:text-white hover:rounded-[30%]"
                )}
                title={server.name}
                aria-label={server.name}
              >
                {server.icon ? (
                  <img src={server.icon} alt="" className="w-full h-12 object-cover" />
                ) : (
                  <span className="text-lg font-semibold">{server.name.slice(0, 2).toUpperCase()}</span>
                )}
              </button>
              {mentionCount > 0 && (
                <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#f23f42] text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-[#1e1f22]">
                  {mentionCount > 99 ? "99+" : mentionCount}
                </span>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setShowCreate(true)}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#23a559] hover:bg-[#23a559] hover:text-white hover:rounded-[50%] transition-all"
          title="Add a server"
          aria-label="Add server"
        >
          <Plus className="w-6 h-6" />
        </button>
        {dmList.length === 0 && null}
      </div>
      <CreateServerModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
