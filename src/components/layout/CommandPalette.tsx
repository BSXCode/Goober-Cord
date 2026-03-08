"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { Hash, MessageCircle, Search } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const servers = useAppStore((s) => s.servers);
  const channels = useAppStore((s) => s.channels);
  const dmChannels = useAppStore((s) => s.dmChannels);
  const users = useAppStore((s) => s.users);
  const setSelectedServer = useAppStore((s) => s.setSelectedServer);
  const setSelectedChannel = useAppStore((s) => s.setSelectedChannel);
  const setSelectedDM = useAppStore((s) => s.setSelectedDM);
  const currentUserId = useAuthStore((s) => s.currentUserId);

  const searchChannels = Object.values(channels).filter(
    (c) =>
      c.type === "text" &&
      c.name.toLowerCase().includes(query.toLowerCase())
  );
  const searchServers = Object.values(servers).filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );
  const searchDMs = Object.values(dmChannels).filter(
    (dm) =>
      dm.type === "dm" &&
      dm.participantIds.includes(currentUserId ?? "") &&
      (() => {
        const otherId = dm.participantIds.find((id) => id !== currentUserId);
        const other = otherId ? users[otherId] : null;
        return other?.username.toLowerCase().includes(query.toLowerCase());
      })()
  );

  const items: { type: "server" | "channel" | "dm"; id: string; name: string; serverId?: string }[] = [
    ...searchServers.map((s) => ({ type: "server" as const, id: s.id, name: s.name })),
    ...searchChannels.map((c) => ({
      type: "channel" as const,
      id: c.id,
      name: c.name,
      serverId: c.serverId,
    })),
    ...searchDMs.map((dm) => {
      const otherId = dm.participantIds.find((id) => id !== currentUserId);
      const other = otherId ? users[otherId] : null;
      return {
        type: "dm" as const,
        id: dm.id,
        name: other ? `${other.username}#${other.discriminator}` : "DM",
      };
    }),
  ].slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (item: (typeof items)[0]) => {
      if (item.type === "server") {
        setSelectedServer(item.id);
        setSelectedChannel(null);
        setSelectedDM(null);
      } else if (item.type === "channel") {
        setSelectedServer(item.serverId ?? null);
        setSelectedChannel(item.id);
        setSelectedDM(null);
      } else {
        setSelectedServer(null);
        setSelectedChannel(null);
        setSelectedDM(item.id);
      }
      setOpen(false);
    },
    [setSelectedServer, setSelectedChannel, setSelectedDM]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[#313338] rounded-lg shadow-xl border border-[#3f4147] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#3f4147]">
          <Search className="w-5 h-5 text-[#b5bac1]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search servers, channels, DMs..."
            className="flex-1 bg-transparent text-white placeholder-[#4e5058] focus:outline-none"
            autoFocus
          />
          <kbd className="text-xs text-[#949ba4]">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {items.length === 0 && (
            <p className="px-4 py-3 text-[#b5bac1] text-sm">No results.</p>
          )}
          {items.map((item, i) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left",
                i === selectedIndex ? "bg-[#3f4147] text-white" : "text-[#dbdee1] hover:bg-[#3f4147]"
              )}
            >
              {item.type === "server" ? (
                <span className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-sm font-semibold">
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
              ) : item.type === "channel" ? (
                <Hash className="w-5 h-5 text-[#b5bac1]" />
              ) : (
                <MessageCircle className="w-5 h-5 text-[#b5bac1]" />
              )}
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
