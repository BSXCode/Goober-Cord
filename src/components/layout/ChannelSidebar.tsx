"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import {
  Hash,
  ChevronDown,
  ChevronRight,
  Mic,
  UserPlus,
  Settings,
  MicOff,
  LogOut,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Pin,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { AccountPanel } from "./AccountPanel";
import { VoiceBar } from "../voice/VoiceBar";
import { FriendsList } from "./FriendsList";
import { SocialTab } from "./SocialTab";
import { ServerSettingsModal } from "./ServerSettingsModal";
import { InviteModal } from "./InviteModal";

export function ChannelSidebar() {
  const [homeTab, setHomeTab] = useState<"friends" | "social" | "dms">("friends");
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const selectedServerId = useAppStore((s) => s.selectedServerId);
  const selectedDMId = useAppStore((s) => s.selectedDMId);
  const servers = useAppStore((s) => s.servers);
  const channels = useAppStore((s) => s.channels);
  const dmChannels = useAppStore((s) => s.dmChannels);
  const messages = useAppStore((s) => s.messages);
  const readStates = useAppStore((s) => s.readStates);
  const users = useAppStore((s) => s.users);
  const collapsedCategories = useAppStore((s) => s.collapsedCategories);
  const setSelectedChannel = useAppStore((s) => s.setSelectedChannel);
  const setSelectedDM = useAppStore((s) => s.setSelectedDM);
  const toggleCategory = useAppStore((s) => s.toggleCategory);
  const selectedChannelId = useAppStore((s) => s.selectedChannelId);
  const voiceStates = useAppStore((s) => s.voiceStates);
  const setVoiceState = useAppStore((s) => s.setVoiceState);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const myVoiceChannelId = currentUserId ? voiceStates[currentUserId]?.channelId ?? null : null;
  const isOwner = selectedServerId ? servers[selectedServerId]?.ownerId === currentUserId : false;

  const moveChannel = (items: typeof channelList, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const sock = getSocket();
    if (!sock) return;
    const updates = items.map((ch, i) => {
      let pos = i;
      if (i === index) pos = target;
      else if (i === target) pos = index;
      return { channelId: ch.id, position: pos };
    });
    sock.emit("channels:reorderBatch", { updates });
  };

  if (!selectedServerId && !selectedDMId) {
    return (
      <div className="w-60 bg-[var(--glass-bg)] backdrop-blur-md flex-shrink-0 flex flex-col min-h-0 border-r border-[var(--glass-border)] shadow-[var(--shadow-cozy)] z-10">
        <div className="h-12 flex-shrink-0 flex items-center border-b border-[var(--glass-border)]">
          <button
            type="button"
            onClick={() => setHomeTab("friends")}
            className={cn(
              "flex-1 px-2 py-2 text-xs font-semibold",
              homeTab === "friends" ? "text-[var(--text)] border-b-2 border-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            Friends
          </button>
          <button
            type="button"
            onClick={() => setHomeTab("social")}
            className={cn(
              "flex-1 px-2 py-2 text-xs font-semibold",
              homeTab === "social" ? "text-[var(--text)] border-b-2 border-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            Social
          </button>
          <button
            type="button"
            onClick={() => setHomeTab("dms")}
            className={cn(
              "flex-1 px-2 py-2 text-xs font-semibold",
              homeTab === "dms" ? "text-[var(--text)] border-b-2 border-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            DMs
          </button>
        </div>
        {homeTab === "friends" ? (
          <FriendsList />
        ) : homeTab === "social" ? (
          <SocialTab />
        ) : (
          <div className="flex-1 overflow-y-auto scroll-thin p-2 min-h-0">
            {Object.values(dmChannels)
              .filter((dm) => dm.participantIds.includes(currentUserId ?? ""))
              .map((dm) => {
                const otherId = dm.participantIds.find((id) => id !== currentUserId);
                const other = otherId ? users[otherId] : null;
                const name = other ? `${other.username}#${other.discriminator}` : "DM";
                const readKey = `${dm.id}-${currentUserId}`;
                const lastRead = readStates[readKey]?.lastReadAt ?? 0;
                const unreadMsgs = Object.values(messages).filter(
                  (m) => m.channelId === dm.id && m.authorId !== currentUserId && m.createdAt > lastRead
                );
                const lastUnread = unreadMsgs.length > 0
                  ? unreadMsgs.sort((a, b) => b.createdAt - a.createdAt)[0]
                  : null;
                return (
                  <button
                    key={dm.id}
                    onClick={() => setSelectedDM(dm.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]",
                      selectedDMId === dm.id && "bg-[var(--channel-hover)] text-[var(--text)]",
                      unreadMsgs.length > 0 && "text-[var(--text)]"
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs text-white flex-shrink-0">
                      {other?.avatar ? (
                        <img src={other.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        other?.username?.slice(0, 1).toUpperCase() ?? "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block text-sm">{other?.username ?? "DM"}</span>
                      {lastUnread && (
                        <span className="truncate block text-[10px] text-[var(--text-muted)] opacity-70">
                          {lastUnread.content.slice(0, 40)}
                        </span>
                      )}
                    </div>
                    {unreadMsgs.length > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-[#f23f42] text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                        {unreadMsgs.length > 99 ? "99+" : unreadMsgs.length}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
        <AccountPanel />
      </div>
    );
  }

  if (selectedDMId) {
    return (
      <div className="w-60 bg-[var(--glass-bg)] backdrop-blur-md flex-shrink-0 flex flex-col min-h-0 border-r border-[var(--glass-border)] shadow-[var(--shadow-cozy)] z-10">
        <div className="h-12 flex-shrink-0 px-4 flex items-center border-b border-[var(--glass-border)]">
          <span className="font-semibold text-[var(--text)]">Direct Messages</span>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin p-2 min-h-0">
          {Object.values(dmChannels)
            .filter((dm) => dm.participantIds.includes(currentUserId ?? ""))
            .map((dm) => {
              const otherId = dm.participantIds.find((id) => id !== currentUserId);
              const other = otherId ? users[otherId] : null;
              const readKey = `${dm.id}-${currentUserId}`;
              const lastRead = readStates[readKey]?.lastReadAt ?? 0;
              const unreadMsgs = Object.values(messages).filter(
                (m) => m.channelId === dm.id && m.authorId !== currentUserId && m.createdAt > lastRead
              );
              const lastUnread = unreadMsgs.length > 0
                ? unreadMsgs.sort((a, b) => b.createdAt - a.createdAt)[0]
                : null;
              return (
                <button
                  key={dm.id}
                  onClick={() => setSelectedDM(dm.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]",
                    selectedDMId === dm.id && "bg-[var(--channel-hover)] text-[var(--text)]",
                    unreadMsgs.length > 0 && "text-[var(--text)]"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs text-white flex-shrink-0">
                    {other?.avatar ? (
                      <img src={other.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      other?.username?.slice(0, 1).toUpperCase() ?? "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block text-sm">{other?.username ?? "DM"}</span>
                    {lastUnread && (
                      <span className="truncate block text-[10px] text-[var(--text-muted)] opacity-70">
                        {lastUnread.content.slice(0, 40)}
                      </span>
                    )}
                  </div>
                  {unreadMsgs.length > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-[#f23f42] text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                      {unreadMsgs.length > 99 ? "99+" : unreadMsgs.length}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        <AccountPanel />
      </div>
    );
  }

  if (!selectedServerId) return null;
  const server = servers[selectedServerId];
  if (!server) return null;

  const channelList = Object.values(channels).filter(
    (c) => c.serverId === selectedServerId
  );
  const categories = channelList.filter((c) => c.type === "category");
  const textChannels = channelList.filter((c) => c.type === "text");
  const voiceChannels = channelList.filter((c) => c.type === "voice");

  const byCategory = new Map<string | null, typeof channelList>();
  byCategory.set(null, []);
  categories.forEach((cat) => byCategory.set(cat.id, []));
  textChannels.forEach((ch) => {
    const cat = ch.categoryId ? byCategory.get(ch.categoryId) : byCategory.get(null);
    if (cat) cat.push(ch);
  });
  const voiceByCategory = new Map<string | null, typeof channelList>();
  voiceChannels.forEach((ch) => {
    const cat = ch.categoryId;
    if (!voiceByCategory.has(cat)) voiceByCategory.set(cat, []);
    voiceByCategory.get(cat)!.push(ch);
  });

  return (
    <div className="w-60 bg-[var(--glass-bg)] backdrop-blur-md flex-shrink-0 flex flex-col min-h-0 border-r border-[var(--glass-border)] shadow-[var(--shadow-cozy)] z-10">
      {/* Server banner + name header */}
      <div className="flex-shrink-0 relative group">
        {server.banner ? (
          <div className="h-28 overflow-hidden relative">
            <img src={server.banner} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex items-end justify-between">
              <span className="font-bold text-white text-sm truncate drop-shadow-lg">{server.name}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setShowInvite(true)} className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20" aria-label="Invite">
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
                {server.ownerId === currentUserId && (
                  <button onClick={() => setShowServerSettings(true)} className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20" aria-label="Server Settings">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
                {server.ownerId !== currentUserId && (
                  <button
                    onClick={() => {
                      if (!currentUserId || !confirm("Leave this server?")) return;
                      getSocket()?.emit("server:leave", { serverId: selectedServerId, userId: currentUserId });
                    }}
                    className="p-1 rounded text-red-400/80 hover:text-red-400 hover:bg-white/20"
                    aria-label="Leave Server"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--glass-border)] hover:bg-[var(--channel-hover)]">
            <span className="font-semibold text-[var(--text)] truncate">{server.name}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setShowInvite(true)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]" aria-label="Invite">
                <UserPlus className="w-4 h-4" />
              </button>
              {server.ownerId === currentUserId && (
                <button onClick={() => setShowServerSettings(true)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]" aria-label="Server Settings">
                  <Settings className="w-4 h-4" />
                </button>
              )}
              {server.ownerId !== currentUserId && (
                <button
                  onClick={() => {
                    if (!currentUserId || !confirm("Leave this server?")) return;
                    getSocket()?.emit("server:leave", { serverId: selectedServerId, userId: currentUserId });
                  }}
                  className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-[var(--channel-hover)]"
                  aria-label="Leave Server"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-2">
        {categories
          .sort((a, b) => a.position - b.position)
          .map((cat, catIdx, sortedCats) => {
            const isCollapsed = collapsedCategories.has(cat.id);
            const texts = (byCategory.get(cat.id) ?? []).sort((a, b) => a.position - b.position);
            const voices = (voiceByCategory.get(cat.id) ?? []).sort((a, b) => a.position - b.position);
            return (
              <div key={cat.id} className="mb-4">
                <div className="flex items-center group/cat">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-0.5 flex-1 py-0.5 text-[var(--text-muted)] hover:text-[var(--text)] uppercase text-xs font-semibold"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {cat.name}
                  </button>
                  {isOwner && (
                    <div className="hidden group-hover/cat:flex items-center gap-0.5 mr-1">
                      {catIdx > 0 && (
                        <button
                          onClick={() => moveChannel(sortedCats, catIdx, -1)}
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {catIdx < sortedCats.length - 1 && (
                        <button
                          onClick={() => moveChannel(sortedCats, catIdx, 1)}
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    {texts.map((ch, chIdx) => (
                        <div key={ch.id} className="flex items-center group/ch">
                          <button
                            onClick={() => setSelectedChannel(ch.id)}
                            className={cn(
                              "flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]",
                              selectedChannelId === ch.id &&
                                "bg-[var(--channel-hover)] text-[var(--text)]"
                            )}
                          >
                            <Hash className="w-4 h-4 flex-shrink-0 opacity-70" />
                            <span className="truncate">{ch.name}</span>
                          </button>
                          {isOwner && (
                            <div className="hidden group-hover/ch:flex items-center gap-0.5 mr-1">
                              {chIdx > 0 && (
                                <button
                                  onClick={() => moveChannel(texts, chIdx, -1)}
                                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                              )}
                              {chIdx < texts.length - 1 && (
                                <button
                                  onClick={() => moveChannel(texts, chIdx, 1)}
                                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    {voices
                      .sort((a, b) => a.position - b.position)
                      .map((ch) => {
                        const isInThis = myVoiceChannelId === ch.id;
                        const usersInChannel = Object.values(voiceStates).filter(vs => vs.channelId === ch.id);
                        return (
                          <div key={ch.id}>
                            <button
                              onClick={() => {
                                if (!currentUserId) return;
                                setVoiceState(currentUserId, isInThis ? null : ch.id, false, false, false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]",
                                isInThis && "bg-[var(--channel-hover)] text-[#23a559]"
                              )}
                            >
                              <Mic className="w-4 h-4 flex-shrink-0 opacity-70" />
                              <span className="truncate">{ch.name}</span>
                            </button>
                            {usersInChannel.length > 0 && (
                              <div className="pl-6 pb-1 space-y-0.5">
                                {usersInChannel.map(vs => {
                                  const user = users[vs.userId];
                                  if (!user) return null;
                                  return (
                                    <div key={vs.userId} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-[var(--channel-hover)]">
                                      <div className="w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center text-[8px] text-white overflow-hidden">
                                        {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
                                      </div>
                                      <span className={cn("text-xs truncate max-w-[120px]", vs.userId === currentUserId ? "font-bold text-[#23a559]" : "text-[var(--text-muted)]")}>
                                        {user.username}
                                      </span>
                                      {vs.muted && <MicOff className="w-3 h-3 text-red-500 ml-auto" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </>
                )}
              </div>
            );
          })}
        {channelList.some((c) => !c.categoryId) && (
          <div className="mb-4">
            {(byCategory.get(null) ?? []).map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]",
                  selectedChannelId === ch.id && "bg-[var(--channel-hover)] text-[var(--text)]"
                )}
              >
                <Hash className="w-4 h-4 flex-shrink-0 opacity-70" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <VoiceBar />
      <AccountPanel />
      {selectedServerId && (
        <>
          <ServerSettingsModal
            serverId={selectedServerId}
            open={showServerSettings}
            onClose={() => setShowServerSettings(false)}
          />
          <InviteModal
            serverId={selectedServerId}
            open={showInvite}
            onClose={() => setShowInvite(false)}
          />
        </>
      )}
    </div>
  );
}
