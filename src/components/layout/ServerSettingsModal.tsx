"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { X, Upload, Image, Plus, Trash2, Hash, Mic, FolderOpen, Play, Volume2 } from "lucide-react";
import type { ChannelType, CustomEmoji, CustomSticker, SoundboardSound } from "@/lib/types";
import { getSocket } from "@/lib/socket";

interface ServerSettingsModalProps {
  serverId: string;
  open: boolean;
  onClose: () => void;
}

type Tab = "overview" | "channels" | "emojis" | "stickers" | "soundboard" | "roles";

const ACCEPT_IMAGE = "image/png,image/jpeg,image/gif,image/webp";
const ACCEPT_AUDIO = "audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4";
const MAX_EMOJI_SIZE = 256 * 1024; // 256KB
const MAX_STICKER_SIZE = 512 * 1024; // 512KB
const MAX_SOUND_SIZE = 500 * 1024; // 500KB
const MAX_SOUNDS = 50;
const EMOJI_DISPLAY_SIZE = 32;
const STICKER_DISPLAY_SIZE = 128;

export function ServerSettingsModal({ serverId, open, onClose }: ServerSettingsModalProps) {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const servers = useAppStore((s) => s.servers);
  const channels = useAppStore((s) => s.channels);
  const updateServer = useAppStore((s) => s.updateServer);
  const deleteServer = useAppStore((s) => s.deleteServer);
  const createChannel = useAppStore((s) => s.createChannel);
  const deleteChannel = useAppStore((s) => s.deleteChannel);
  const addCustomEmoji = useAppStore((s) => s.addCustomEmoji);
  const removeCustomEmoji = useAppStore((s) => s.removeCustomEmoji);
  const addCustomSticker = useAppStore((s) => s.addCustomSticker);
  const removeCustomSticker = useAppStore((s) => s.removeCustomSticker);

  const [tab, setTab] = useState<Tab>("overview");
  const [serverName, setServerName] = useState("");
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [serverDesc, setServerDesc] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [defaultNotifs, setDefaultNotifs] = useState<"all" | "mentions">("all");
  const [nsfwFlag, setNsfwFlag] = useState(false);
  const [accentColor, setAccentColor] = useState("#5865f2");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<ChannelType>("text");
  const [newChannelCategory, setNewChannelCategory] = useState<string | null>(null);
  const [emojiName, setEmojiName] = useState("");
  const [stickerName, setStickerName] = useState("");
  const iconRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const emojiFileRef = useRef<HTMLInputElement>(null);
  const stickerFileRef = useRef<HTMLInputElement>(null);
  const [emojiPreview, setEmojiPreview] = useState<string | null>(null);
  const [stickerPreview, setStickerPreview] = useState<string | null>(null);
  const [soundName, setSoundName] = useState("");
  const [soundPreview, setSoundPreview] = useState<string | null>(null);
  const [soundSize, setSoundSize] = useState(0);
  const soundFileRef = useRef<HTMLInputElement>(null);

  const server = servers[serverId];
  const isOwner = server?.ownerId === currentUserId;

  const serverChannels = useMemo(
    () => Object.values(channels).filter((c) => c.serverId === serverId).sort((a, b) => a.position - b.position),
    [channels, serverId]
  );
  const categories = serverChannels.filter((c) => c.type === "category");
  const nonCategories = serverChannels.filter((c) => c.type !== "category");

  useEffect(() => {
    if (server && open) {
      setServerName(server.name);
      setServerDesc(server.description ?? "");
      setWelcomeMsg(server.welcomeMessage ?? "");
      setDefaultNotifs(server.defaultNotifications ?? "all");
      setNsfwFlag(server.nsfw ?? false);
      setAccentColor(server.accentColor ?? "#5865f2");
    }
  }, [server?.name, open]);

  if (!open || !server || typeof document === "undefined") return null;

  const readFile = (file: File, cb: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveOverview = () => {
    const patch: Partial<typeof server> = {};
    if (serverName.trim() && serverName.trim() !== server.name) patch.name = serverName.trim();
    if (pendingIcon !== null) patch.icon = pendingIcon || undefined;
    if (pendingBanner !== null) patch.banner = pendingBanner || undefined;
    (patch as any).description = serverDesc.trim() || undefined;
    (patch as any).welcomeMessage = welcomeMsg.trim() || undefined;
    (patch as any).defaultNotifications = defaultNotifs;
    (patch as any).nsfw = nsfwFlag;
    (patch as any).accentColor = accentColor;
    if (Object.keys(patch).length > 0) updateServer(serverId, patch);
    setPendingIcon(null);
    setPendingBanner(null);
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannel(serverId, newChannelName.trim().toLowerCase().replace(/\s+/g, "-"), newChannelType, newChannelCategory);
    setNewChannelName("");
  };

  const handleAddEmoji = () => {
    if (!emojiName.trim() || !emojiPreview) return;
    addCustomEmoji(serverId, emojiName.trim().toLowerCase().replace(/\s+/g, "_"), emojiPreview);
    setEmojiName("");
    setEmojiPreview(null);
    if (emojiFileRef.current) emojiFileRef.current.value = "";
  };

  const handleAddSticker = () => {
    if (!stickerName.trim() || !stickerPreview) return;
    addCustomSticker(serverId, stickerName.trim(), stickerPreview);
    setStickerName("");
    setStickerPreview(null);
    if (stickerFileRef.current) stickerFileRef.current.value = "";
  };

  const emojis = server.customEmojis ?? [];
  const stickers = server.customStickers ?? [];

  const sounds: SoundboardSound[] = server.soundboard ?? [];

  const handleAddSound = () => {
    if (!soundName.trim() || !soundPreview) return;
    const sound: SoundboardSound = {
      id: Math.random().toString(36).slice(2, 12),
      name: soundName.trim(),
      url: soundPreview,
      size: soundSize,
    };
    const sock = getSocket();
    if (sock) {
      sock.emit("soundboard:add", { serverId, sound }, (res: any) => {
        if (!res?.ok) alert(res?.error ?? "Failed to add sound");
      });
    }
    setSoundName("");
    setSoundPreview(null);
    setSoundSize(0);
    if (soundFileRef.current) soundFileRef.current.value = "";
  };

  const handleRemoveSound = (soundId: string) => {
    const sock = getSocket();
    if (sock) sock.emit("soundboard:remove", { serverId, soundId });
  };

  const handlePlaySound = (soundId: string) => {
    const sound = sounds.find((s) => s.id === soundId);
    if (sound?.url) {
      const audio = new Audio(sound.url);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
    const sock = getSocket();
    if (sock) sock.emit("soundboard:play", { serverId, soundId });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "channels", label: "Channels" },
    { id: "emojis", label: `Emojis (${emojis.length}/250)` },
    { id: "stickers", label: `Stickers (${stickers.length}/250)` },
    { id: "soundboard", label: `Soundboard (${sounds.length}/${MAX_SOUNDS})` },
    { id: "roles", label: "Roles" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#3f4147]">
          <h2 className="text-lg font-bold text-white">Server Settings — {server.name}</h2>
          <button onClick={onClose} className="p-1 rounded text-[#b5bac1] hover:text-white hover:bg-[#3f4147]"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar tabs */}
          <div className="w-44 flex-shrink-0 bg-[#2b2d31] p-2 space-y-0.5 overflow-y-auto no-scrollbar">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("w-full px-3 py-1.5 rounded text-sm text-left", tab === t.id ? "bg-[#3f4147] text-white font-medium" : "text-[#b5bac1] hover:text-white hover:bg-[#3f4147]/50")}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-5">
            {tab === "overview" && (
              <div className="space-y-5">
                {/* Banner */}
                <div>
                  <label className="block text-xs font-semibold text-[#b5bac1] uppercase mb-1.5">Banner</label>
                  <div className="relative h-32 rounded-lg bg-[#2b2d31] overflow-hidden border border-[#3f4147]">
                    {(pendingBanner ?? server.banner) ? (
                      <img src={pendingBanner ?? server.banner} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#4e5058]"><Image className="w-8 h-8" /></div>
                    )}
                    <input ref={bannerRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) readFile(f, (u) => setPendingBanner(u)); e.target.value = "";
                    }} />
                    {isOwner && (
                      <button onClick={() => bannerRef.current?.click()} className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm">
                        <Upload className="w-4 h-4 mr-1.5" /> Change Banner
                      </button>
                    )}
                  </div>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-xs font-semibold text-[#b5bac1] uppercase mb-1.5">Icon</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#2b2d31] border border-[#3f4147] overflow-hidden flex items-center justify-center text-[#4e5058] text-2xl font-bold">
                      {(pendingIcon ?? server.icon) ? <img src={pendingIcon ?? server.icon} alt="" className="w-full h-full object-cover" /> : server.name.slice(0, 2).toUpperCase()}
                    </div>
                    <input ref={iconRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) readFile(f, (u) => setPendingIcon(u)); e.target.value = "";
                    }} />
                    {isOwner && (
                      <button onClick={() => iconRef.current?.click()} className="px-3 py-1.5 rounded bg-[#3f4147] text-[#dbdee1] text-sm hover:bg-[#4e5058]">Upload Icon</button>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#b5bac1] uppercase mb-1.5">Server Name</label>
                  <input type="text" value={serverName} onChange={(e) => setServerName(e.target.value)} disabled={!isOwner} maxLength={64}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white focus:border-[#5865f2] focus:outline-none disabled:opacity-50" />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#b5bac1] uppercase mb-1.5">Description</label>
                  <textarea value={serverDesc} onChange={(e) => setServerDesc(e.target.value)} disabled={!isOwner} maxLength={256}
                    placeholder="Tell people about your server..."
                    rows={3}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none disabled:opacity-50 resize-none text-sm" />
                  <p className="text-[10px] text-[#4e5058] mt-0.5 text-right">{serverDesc.length}/256</p>
                </div>

                {/* Welcome Message */}
                <div>
                  <label className="block text-xs font-semibold text-[#b5bac1] uppercase mb-1.5">Welcome Message</label>
                  <input type="text" value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)} disabled={!isOwner} maxLength={200}
                    placeholder="Welcome to the server! 🎉"
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none disabled:opacity-50 text-sm" />
                  <p className="text-[10px] text-[#4e5058] mt-0.5">Shown to new members when they join.</p>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-xs font-semibold text-[#b5bac1] uppercase mb-1.5">Server Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} disabled={!isOwner}
                      className="w-10 h-10 rounded border-none bg-transparent cursor-pointer disabled:opacity-50" />
                    <div className="h-8 flex-1 rounded-lg" style={{ background: accentColor }} />
                  </div>
                </div>

                {/* Default Notifications */}
                <div>
                  <label className="block text-xs font-semibold text-[#b5bac1] uppercase mb-1.5">Default Notifications</label>
                  <select value={defaultNotifs} onChange={(e) => setDefaultNotifs(e.target.value as "all" | "mentions")} disabled={!isOwner}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white focus:outline-none disabled:opacity-50 text-sm">
                    <option value="all">All Messages</option>
                    <option value="mentions">Only @Mentions</option>
                  </select>
                </div>

                {/* NSFW */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={nsfwFlag} onChange={(e) => setNsfwFlag(e.target.checked)} disabled={!isOwner}
                      className="w-4 h-4 rounded bg-[#1e1f22] border border-[#3f4147] accent-[#5865f2] disabled:opacity-50" />
                    <span className="text-sm text-[#dbdee1]">Age-Restricted Server (NSFW)</span>
                  </label>
                </div>

                {isOwner && (
                  <button onClick={handleSaveOverview} className="px-4 py-2 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium text-sm">
                    Save Changes
                  </button>
                )}

                {isOwner && (
                  <div className="border-t border-[#3f4147] pt-5 mt-5">
                    <h3 className="text-xs font-semibold text-red-400 uppercase mb-2">Danger Zone</h3>
                    <p className="text-xs text-[#b5bac1] mb-3">Permanently delete this server and all its channels, messages, and members.</p>
                    <button
                      onClick={() => {
                        if (!confirm(`Are you sure you want to delete "${server.name}"? This cannot be undone.`)) return;
                        deleteServer(serverId);
                        onClose();
                      }}
                      className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors"
                    >
                      Delete Server
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "channels" && (
              <div className="space-y-4">
                {isOwner && (
                  <div className="bg-[#2b2d31] rounded-lg p-4 border border-[#3f4147]">
                    <h3 className="text-sm font-semibold text-white mb-3">Create Channel</h3>
                    <div className="flex flex-col gap-2">
                      <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="channel-name"
                        maxLength={64} className="px-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none"
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); }} />
                      <div className="flex gap-2">
                        <select value={newChannelType} onChange={(e) => setNewChannelType(e.target.value as ChannelType)}
                          className="flex-1 px-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm focus:outline-none">
                          <option value="text">Text Channel</option>
                          <option value="voice">Voice Channel</option>
                          <option value="category">Category</option>
                        </select>
                        {newChannelType !== "category" && (
                          <select value={newChannelCategory ?? ""} onChange={(e) => setNewChannelCategory(e.target.value || null)}
                            className="flex-1 px-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm focus:outline-none">
                            <option value="">No Category</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        )}
                      </div>
                      <button onClick={handleCreateChannel} disabled={!newChannelName.trim()}
                        className="self-start px-3 py-1.5 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium disabled:opacity-50">
                        <Plus className="w-3.5 h-3.5 inline mr-1" /> Create
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {categories.map((cat) => {
                    const children = nonCategories.filter((c) => c.categoryId === cat.id);
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#3f4147]/50 group">
                          <div className="flex items-center gap-1.5 text-[#b5bac1] text-xs font-semibold uppercase">
                            <FolderOpen className="w-3.5 h-3.5" />
                            {cat.name}
                          </div>
                          {isOwner && (
                            <button onClick={() => deleteChannel(cat.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {children.map((ch) => (
                          <div key={ch.id} className="flex items-center justify-between py-1 px-4 rounded hover:bg-[#3f4147]/50 group ml-2">
                            <div className="flex items-center gap-1.5 text-sm text-[#dbdee1]">
                              {ch.type === "voice" ? <Mic className="w-3.5 h-3.5 text-[#b5bac1]" /> : <Hash className="w-3.5 h-3.5 text-[#b5bac1]" />}
                              {ch.name}
                            </div>
                            {isOwner && (
                              <button onClick={() => deleteChannel(ch.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {nonCategories.filter((c) => !c.categoryId).map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#3f4147]/50 group">
                      <div className="flex items-center gap-1.5 text-sm text-[#dbdee1]">
                        {ch.type === "voice" ? <Mic className="w-3.5 h-3.5 text-[#b5bac1]" /> : <Hash className="w-3.5 h-3.5 text-[#b5bac1]" />}
                        {ch.name}
                      </div>
                      {isOwner && (
                        <button onClick={() => deleteChannel(ch.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "emojis" && (
              <div className="space-y-4">
                {isOwner && (
                  <div className="bg-[#2b2d31] rounded-lg p-4 border border-[#3f4147]">
                    <h3 className="text-sm font-semibold text-white mb-3">Upload Emoji</h3>
                    <p className="text-xs text-[#b5bac1] mb-2">Images will be resized to {EMOJI_DISPLAY_SIZE}x{EMOJI_DISPLAY_SIZE}px. Max {MAX_EMOJI_SIZE / 1024}KB per file. Limit: 250 emojis.</p>
                    <div className="flex items-end gap-3">
                      <div>
                        <input ref={emojiFileRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > MAX_EMOJI_SIZE) { alert("File too large (max 256KB)"); return; }
                          readFile(f, setEmojiPreview);
                          if (!emojiName) setEmojiName(f.name.replace(/\.\w+$/, "").slice(0, 20));
                        }} />
                        <button onClick={() => emojiFileRef.current?.click()} className="w-12 h-12 rounded-lg bg-[#1e1f22] border border-dashed border-[#3f4147] hover:border-[#5865f2] flex items-center justify-center overflow-hidden">
                          {emojiPreview ? <img src={emojiPreview} alt="" className="w-8 h-8 object-contain" /> : <Plus className="w-5 h-5 text-[#4e5058]" />}
                        </button>
                      </div>
                      <input type="text" value={emojiName} onChange={(e) => setEmojiName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="emoji_name" maxLength={20}
                        className="flex-1 px-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none" />
                      <button onClick={handleAddEmoji} disabled={!emojiName.trim() || !emojiPreview || emojis.length >= 250}
                        className="px-3 py-1.5 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium disabled:opacity-50">
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {emojis.length === 0 ? (
                  <p className="text-sm text-[#b5bac1] text-center py-6">No custom emojis yet.</p>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                    {emojis.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded bg-[#2b2d31] border border-[#3f4147] group">
                        <img src={e.url} alt={e.name} className="w-8 h-8 object-contain flex-shrink-0" />
                        <span className="text-sm text-[#dbdee1] truncate flex-1">:{e.name}:</span>
                        {isOwner && (
                          <button onClick={() => removeCustomEmoji(serverId, e.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "stickers" && (
              <div className="space-y-4">
                {isOwner && (
                  <div className="bg-[#2b2d31] rounded-lg p-4 border border-[#3f4147]">
                    <h3 className="text-sm font-semibold text-white mb-3">Upload Sticker</h3>
                    <p className="text-xs text-[#b5bac1] mb-2">Images will display at {STICKER_DISPLAY_SIZE}x{STICKER_DISPLAY_SIZE}px. Max {MAX_STICKER_SIZE / 1024}KB per file. Limit: 250 stickers.</p>
                    <div className="flex items-end gap-3">
                      <div>
                        <input ref={stickerFileRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > MAX_STICKER_SIZE) { alert("File too large (max 512KB)"); return; }
                          readFile(f, setStickerPreview);
                          if (!stickerName) setStickerName(f.name.replace(/\.\w+$/, "").slice(0, 30));
                        }} />
                        <button onClick={() => stickerFileRef.current?.click()} className="w-20 h-20 rounded-lg bg-[#1e1f22] border border-dashed border-[#3f4147] hover:border-[#5865f2] flex items-center justify-center overflow-hidden">
                          {stickerPreview ? <img src={stickerPreview} alt="" className="w-16 h-16 object-contain" /> : <Plus className="w-6 h-6 text-[#4e5058]" />}
                        </button>
                      </div>
                      <input type="text" value={stickerName} onChange={(e) => setStickerName(e.target.value)} placeholder="Sticker name" maxLength={30}
                        className="flex-1 px-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none" />
                      <button onClick={handleAddSticker} disabled={!stickerName.trim() || !stickerPreview || stickers.length >= 250}
                        className="px-3 py-1.5 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium disabled:opacity-50">
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {stickers.length === 0 ? (
                  <p className="text-sm text-[#b5bac1] text-center py-6">No custom stickers yet.</p>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                    {stickers.map((s) => (
                      <div key={s.id} className="flex flex-col items-center p-3 rounded-lg bg-[#2b2d31] border border-[#3f4147] group relative">
                        <img src={s.url} alt={s.name} className="w-24 h-24 object-contain" />
                        <span className="text-xs text-[#dbdee1] mt-1.5 truncate max-w-full">{s.name}</span>
                        {isOwner && (
                          <button onClick={() => removeCustomSticker(serverId, s.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-red-500/80 text-white hover:bg-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "soundboard" && (
              <div className="space-y-4">
                {isOwner && (
                  <div className="bg-[#2b2d31] rounded-lg p-4 border border-[#3f4147]">
                    <h3 className="text-sm font-semibold text-white mb-3">Add Sound</h3>
                    <p className="text-xs text-[#b5bac1] mb-2">Upload audio files (mp3, wav, ogg). Max {MAX_SOUND_SIZE / 1024}KB per file. Limit: {MAX_SOUNDS} sounds.</p>
                    <div className="flex items-end gap-3">
                      <div>
                        <input ref={soundFileRef} type="file" accept={ACCEPT_AUDIO} className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > MAX_SOUND_SIZE) { alert(`File too large (max ${MAX_SOUND_SIZE / 1024}KB)`); return; }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setSoundPreview(reader.result as string);
                            setSoundSize(f.size);
                          };
                          reader.readAsDataURL(f);
                          if (!soundName) setSoundName(f.name.replace(/\.\w+$/, "").slice(0, 30));
                        }} />
                        <button onClick={() => soundFileRef.current?.click()} className="w-12 h-12 rounded-lg bg-[#1e1f22] border border-dashed border-[#3f4147] hover:border-[#5865f2] flex items-center justify-center">
                          {soundPreview ? <Volume2 className="w-5 h-5 text-[#5865f2]" /> : <Plus className="w-5 h-5 text-[#4e5058]" />}
                        </button>
                      </div>
                      <input type="text" value={soundName} onChange={(e) => setSoundName(e.target.value)} placeholder="Sound name" maxLength={30}
                        className="flex-1 px-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none" />
                      <button onClick={handleAddSound} disabled={!soundName.trim() || !soundPreview || sounds.length >= MAX_SOUNDS}
                        className="px-3 py-1.5 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium disabled:opacity-50">
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {sounds.length === 0 ? (
                  <p className="text-sm text-[#b5bac1] text-center py-6">No sounds yet. Upload sounds to let server members play them!</p>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                    {sounds.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2b2d31] border border-[#3f4147] group">
                        <button
                          onClick={() => handlePlaySound(s.id)}
                          className="w-8 h-8 rounded-full bg-[#5865f2] hover:bg-[#4752c4] flex items-center justify-center flex-shrink-0 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-[#dbdee1] truncate block">{s.name}</span>
                          <span className="text-[10px] text-[#949ba4]">{Math.round(s.size / 1024)}KB</span>
                        </div>
                        {isOwner && (
                          <button onClick={() => handleRemoveSound(s.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300 flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "roles" && (
              <div className="space-y-4">
                <p className="text-sm text-[#b5bac1]">Manage server roles and their colors. Roles determine the name color shown in the member list.</p>
                {(() => {
                  const roles = useAppStore.getState().roles;
                  const serverRoles = Object.values(roles).filter((r) => r.serverId === serverId).sort((a, b) => b.position - a.position);
                  return serverRoles.length === 0 ? (
                    <p className="text-sm text-[#949ba4] text-center py-6">No custom roles yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {serverRoles.map((role) => (
                        <div key={role.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#2b2d31] border border-[#3f4147]">
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: role.color || "#99aab5" }} />
                          <span className="text-sm text-[#dbdee1] flex-1">{role.name}</span>
                          {isOwner && (
                            <input type="color" value={role.color || "#99aab5"}
                              onChange={(e) => {
                                const sock = getSocket();
                                if (sock) sock.emit("role:update", { roleId: role.id, patch: { color: e.target.value } });
                              }}
                              className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
