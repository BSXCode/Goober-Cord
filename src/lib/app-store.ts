"use client";

import { create } from "zustand";
import type {
  AuthUser,
  Channel,
  CustomEmoji,
  CustomSticker,
  DMChannel,
  Member,
  Message,
  ReadState,
  Role,
  Server,
  Thread,
  VoiceState,
  MessageAttachment,
  ChannelType,
} from "./types";
import type { PersistedData } from "./persist";
import type { CustomGradient } from "./client-settings";
import { playSend, playNavigate, playError } from "./sounds";

type ChannelId = string;

/* ─── Socket emitter (set by socket.ts to avoid circular dep) ─── */

type SocketEmitter = (event: string, ...args: any[]) => void;
let _socketEmit: SocketEmitter | null = null;

export function bindSocketEmitter(fn: SocketEmitter) {
  _socketEmit = fn;
}

function sock(event: string, ...args: any[]) {
  _socketEmit?.(event, ...args);
}

/* ─── Store interface ─── */

export interface AppState extends PersistedData {
  synced: boolean;
  selectedServerId: string | null;
  selectedChannelId: string | null;
  selectedDMId: string | null;
  memberListOpen: boolean;
  threadPanelMessageId: string | null;
  settingsOpen: boolean;
  collapsedCategories: Set<string>;
  typing: Map<ChannelId, Set<string>>;
  presence: Record<string, { status: "online" | "idle" | "dnd" | "offline"; customStatus?: string }>;
  theme: "dark" | "light" | "bendy" | "undertale";
  accentColor: string;
  density: "compact" | "cozy";
  customGradient: CustomGradient;
  customCss: string;

  init: () => void;
  addUser: (user: AuthUser) => void;
  updateUser: (userId: string, patch: Partial<Pick<AuthUser, "avatar" | "banner" | "bio" | "customStatus" | "presence" | "favoriteGifIds" | "favoriteGifs" | "badges" | "widget" | "profileTheme" | "nameplate" | "nameColor" | "avatarDecoration" | "profileEffect" | "pronouns">>) => void;
  toggleFavoriteGif: (userId: string, gif: { id: string; url: string }) => void;
  setSelectedServer: (serverId: string | null) => void;
  setSelectedChannel: (channelId: string | null) => void;
  setSelectedDM: (dmId: string | null) => void;
  toggleMemberList: () => void;
  toggleCategory: (categoryId: string) => void;
  setThreadPanel: (messageId: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setTyping: (channelId: string, userId: string, typing: boolean) => void;
  setPresence: (userId: string, status: "online" | "idle" | "dnd" | "offline", customStatus?: string) => void;
  setTheme: (theme: "dark" | "light" | "bendy" | "undertale") => void;
  setAccentColor: (color: string) => void;
  setDensity: (density: "compact" | "cozy") => void;
  setCustomGradient: (gradient: CustomGradient) => void;
  setCustomCss: (css: string) => void;
  sendMessage: (currentUserId: string, channelId: string, content: string, opts?: { replyToId?: string; threadId?: string; attachments?: MessageAttachment[]; invite?: import("./types").ServerInvite }) => void;
  editMessage: (currentUserId: string, channelId: string, messageId: string, content: string) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  addReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  removeReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  togglePin: (channelId: string, messageId: string) => void;
  ackRead: (channelId: string, userId: string, lastMessageId: string | null) => void;
  sendThreadReply: (currentUserId: string, channelId: string, threadId: string, content: string, attachments?: MessageAttachment[]) => void;
  archiveThread: (threadId: string) => void;
  setVoiceState: (userId: string, channelId: string | null, muted: boolean, deafened: boolean, speaking: boolean) => void;
  createServer: (name: string, ownerId: string, icon?: string, banner?: string) => string;
  updateServer: (serverId: string, patch: Partial<Server>) => void;
  deleteServer: (serverId: string) => void;
  createChannel: (serverId: string, name: string, type: ChannelType, categoryId: string | null) => string;
  deleteChannel: (channelId: string) => void;
  addCustomEmoji: (serverId: string, name: string, url: string) => boolean;
  removeCustomEmoji: (serverId: string, emojiId: string) => void;
  addCustomSticker: (serverId: string, name: string, url: string) => boolean;
  removeCustomSticker: (serverId: string, stickerId: string) => void;
  updateRole: (roleId: string, patch: Partial<Role>) => void;
  addMemberRole: (memberId: string, roleId: string) => void;
  removeMemberRole: (memberId: string, roleId: string) => void;
  getOrCreateDM: (userId: string, currentUserId: string) => string;
  joinServer: (serverId: string, userId: string) => void;
}

const emptyData: PersistedData = {
  users: {},
  roles: {},
  servers: {},
  channels: {},
  members: {},
  messages: {},
  threads: {},
  dmChannels: {},
  readStates: {},
  voiceStates: {},
};

function id(): string {
  return Math.random().toString(36).slice(2, 12);
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...emptyData,
  synced: false,
  selectedServerId: null,
  selectedChannelId: null,
  selectedDMId: null,
  memberListOpen: true,
  threadPanelMessageId: null,
  settingsOpen: false,
  collapsedCategories: new Set(),
  typing: new Map(),
  presence: {},
  theme: "dark",
  accentColor: "#5865F2",
  density: "cozy",
  customGradient: { enabled: false, color1: "#5865f2", color2: "#2b2d31", angle: 45, speed: 10, animated: true },
  customCss: "",

  init() {
    if (typeof window !== "undefined") {
      const { getTheme, getAccentColor, getCustomGradient, getCustomCss } = require("./client-settings");
      const savedTheme = getTheme();
      const savedAccent = getAccentColor();
      const savedGradient = getCustomGradient();
      const savedCss = getCustomCss();
      
      if (savedTheme) {
        set({ theme: savedTheme });
        document.documentElement.classList.remove("dark", "light", "bendy", "undertale");
        document.documentElement.classList.add(savedTheme);
        if (savedTheme === "undertale") {
          const link = document.createElement("link");
          link.id = "undertale-font-link";
          link.rel = "stylesheet";
          link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
          document.head.appendChild(link);
        }
      }
      if (savedAccent) {
        set({ accentColor: savedAccent });
        document.documentElement.style.setProperty("--accent", savedAccent);
      }
      if (savedGradient) {
        set({ customGradient: savedGradient });
        if (savedGradient.enabled) {
          document.documentElement.style.setProperty("--gradient-color-1", savedGradient.color1);
          document.documentElement.style.setProperty("--gradient-color-2", savedGradient.color2);
          document.documentElement.style.setProperty("--gradient-angle", `${savedGradient.angle}deg`);
          document.documentElement.style.setProperty("--gradient-speed", `${savedGradient.speed}s`);
          document.documentElement.classList.toggle("custom-gradient", true);
        }
      }
      if (savedCss) {
        set({ customCss: savedCss });
        let style = document.getElementById("custom-css-style");
        if (!style) {
          style = document.createElement("style");
          style.id = "custom-css-style";
          document.head.appendChild(style);
        }
        style.textContent = savedCss;
      }
    }
  },

  addUser(user: AuthUser) {
    set((s) => ({ users: { ...s.users, [user.id]: user } }));
  },

  updateUser(userId, patch) {
    set((s) => {
      const u = s.users[userId];
      if (!u) return s;
      return { users: { ...s.users, [userId]: { ...u, ...patch } } };
    });
    sock("user:update", { userId, patch });
  },

  toggleFavoriteGif(userId, gif) {
    set((s) => {
      const u = s.users[userId];
      if (!u) return s;
      const list = u.favoriteGifs ?? [];
      const exists = list.some((f) => f.id === gif.id);
      const next = exists ? list.filter((f) => f.id !== gif.id) : [...list, gif];
      return { users: { ...s.users, [userId]: { ...u, favoriteGifs: next } } };
    });
    sock("user:toggleFavGif", { userId, gif });
  },

  setSelectedServer(serverId) {
    set({ selectedServerId: serverId, selectedChannelId: null, selectedDMId: null });
  },
  setSelectedChannel(channelId) {
    set({ selectedChannelId: channelId, selectedDMId: null, threadPanelMessageId: null });
    playNavigate();
  },
  setSelectedDM(dmId) {
    set({ selectedDMId: dmId, selectedServerId: null, selectedChannelId: null });
    playNavigate();
  },
  toggleMemberList() {
    set((s) => ({ memberListOpen: !s.memberListOpen }));
  },
  toggleCategory(categoryId) {
    set((s) => {
      const next = new Set(s.collapsedCategories);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return { collapsedCategories: next };
    });
  },
  setThreadPanel(messageId) {
    set({ threadPanelMessageId: messageId });
  },
  setSettingsOpen(open) {
    set({ settingsOpen: open });
  },

  setTyping(channelId, userId, typing) {
    let changed = false;
    set((s) => {
      const next = new Map(s.typing);
      const typingUsers = new Set(next.get(channelId) ?? []);
      const alreadyTyping = typingUsers.has(userId);
      if (typing && !alreadyTyping) {
        typingUsers.add(userId);
        changed = true;
      } else if (!typing && alreadyTyping) {
        typingUsers.delete(userId);
        changed = true;
      }
      if (!changed) return s;
      if (typingUsers.size === 0) next.delete(channelId);
      else next.set(channelId, typingUsers);
      return { typing: next };
    });
    if (changed) {
      sock(typing ? "typing:start" : "typing:stop", { channelId, userId });
    }
  },

  setPresence(userId, status, customStatus) {
    set((s) => ({
      presence: { ...s.presence, [userId]: { status, customStatus } },
    }));
    sock("presence:set", { userId, status, customStatus });
  },

  setTheme(theme) {
    set({ theme });
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark", "light", "bendy", "undertale");
      document.documentElement.classList.add(theme);
    }
    const { setTheme: saveTheme } = require("./client-settings");
    saveTheme(theme);
  },
  setAccentColor(accentColor) {
    set({ accentColor });
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--accent", accentColor);
    }
    const { setAccentColor: saveAccent } = require("./client-settings");
    saveAccent(accentColor);
  },
  setDensity(density) {
    set({ density });
  },
  setCustomGradient(gradient) {
    set({ customGradient: gradient });
    if (typeof document !== "undefined") {
      if (gradient.enabled) {
        document.documentElement.style.setProperty("--gradient-color-1", gradient.color1);
        document.documentElement.style.setProperty("--gradient-color-2", gradient.color2);
        document.documentElement.style.setProperty("--gradient-angle", `${gradient.angle}deg`);
        document.documentElement.style.setProperty("--gradient-speed", `${gradient.speed}s`);
        document.documentElement.classList.add("custom-gradient");
      } else {
        document.documentElement.classList.remove("custom-gradient");
      }
    }
    const { setCustomGradient: saveGradient } = require("./client-settings");
    saveGradient(gradient);
  },
  setCustomCss(css) {
    set({ customCss: css });
    if (typeof document !== "undefined") {
      let style = document.getElementById("custom-css-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "custom-css-style";
        document.head.appendChild(style);
      }
      style.textContent = css;
    }
    const { setCustomCss: saveCss } = require("./client-settings");
    saveCss(css);
  },

  /* ─── Messages ─── */

  sendMessage(currentUserId, channelId, content, opts = {}) {
    const msg: Message = {
      id: id(),
      channelId,
      authorId: currentUserId,
      content,
      createdAt: Date.now(),
      edited: false,
      replyToId: opts.replyToId ?? null,
      threadId: opts.threadId ?? null,
      attachments: opts.attachments ?? [],
      invite: (opts as any).invite ?? undefined,
      reactions: {},
      pinned: false,
    };
    set((s) => {
      const nextTyping = new Map(s.typing);
      const typingUsers = new Set(nextTyping.get(channelId) ?? []);
      typingUsers.delete(currentUserId);
      if (typingUsers.size === 0) nextTyping.delete(channelId);
      else nextTyping.set(channelId, typingUsers);
      return { messages: { ...s.messages, [msg.id]: msg }, typing: nextTyping };
    });
    sock("message:send", msg);
    playSend();
  },

  editMessage(_currentUserId, channelId, messageId, content) {
    set((s) => {
      const m = s.messages[messageId];
      if (!m || m.channelId !== channelId) return s;
      const updated = { ...m, content, edited: true, updatedAt: Date.now() };
      return { messages: { ...s.messages, [messageId]: updated } };
    });
    sock("message:edit", { messageId, content });
  },

  deleteMessage(channelId, messageId) {
    set((s) => {
      const next = { ...s.messages };
      delete next[messageId];
      return { messages: next };
    });
    sock("message:delete", { channelId, messageId });
  },

  addReaction(channelId, messageId, emoji, userId) {
    set((s) => {
      const m = s.messages[messageId];
      if (!m) return s;
      const reactions = { ...m.reactions };
      const list = [...(reactions[emoji] ?? [])];
      if (list.includes(userId)) return s;
      list.push(userId);
      reactions[emoji] = list;
      return { messages: { ...s.messages, [messageId]: { ...m, reactions } } };
    });
    sock("reaction:add", { messageId, emoji, userId });
  },

  removeReaction(channelId, messageId, emoji, userId) {
    set((s) => {
      const m = s.messages[messageId];
      if (!m) return s;
      const reactions = { ...m.reactions };
      const list = (reactions[emoji] ?? []).filter((id) => id !== userId);
      if (list.length === 0) delete reactions[emoji];
      else reactions[emoji] = list;
      return { messages: { ...s.messages, [messageId]: { ...m, reactions } } };
    });
    sock("reaction:remove", { messageId, emoji, userId });
  },

  togglePin(channelId, messageId) {
    set((s) => {
      const m = s.messages[messageId];
      if (!m) return s;
      return { messages: { ...s.messages, [messageId]: { ...m, pinned: !m.pinned } } };
    });
    sock("message:togglePin", { messageId });
  },

  ackRead(channelId, userId, lastMessageId) {
    const key = `${channelId}-${userId}`;
    set((s) => ({
      readStates: {
        ...s.readStates,
        [key]: { channelId, userId, lastMessageId, lastReadAt: Date.now() },
      },
    }));
    sock("read:ack", { channelId, userId, lastMessageId });
  },

  /* ─── Threads ─── */

  sendThreadReply(currentUserId, channelId, threadId, content, attachments = []) {
    const msg: Message = {
      id: id(),
      channelId,
      authorId: currentUserId,
      content,
      createdAt: Date.now(),
      edited: false,
      replyToId: null,
      threadId,
      attachments: attachments ?? [],
      reactions: {},
      pinned: false,
    };
    set((s) => {
      const messages = { ...s.messages, [msg.id]: msg };
      const nextTyping = new Map(s.typing);
      const typingUsers = new Set(nextTyping.get(channelId) ?? []);
      typingUsers.delete(currentUserId);
      if (typingUsers.size === 0) nextTyping.delete(channelId);
      else nextTyping.set(channelId, typingUsers);
      const thread = s.threads[threadId];
      if (!thread) return { messages, typing: nextTyping };
      return {
        messages,
        typing: nextTyping,
        threads: {
          ...s.threads,
          [threadId]: { ...thread, messageIds: [...thread.messageIds, msg.id] },
        },
      };
    });
    sock("thread:reply", msg);
  },

  archiveThread(threadId) {
    set((s) => {
      const t = s.threads[threadId];
      if (!t) return s;
      return { threads: { ...s.threads, [threadId]: { ...t, archivedAt: Date.now() } } };
    });
    sock("thread:archive", { threadId });
  },

  /* ─── Voice ─── */

  setVoiceState(userId, channelId, muted, deafened, speaking) {
    const state = { userId, channelId, muted, deafened, speaking };
    set((s) => ({
      voiceStates: { ...s.voiceStates, [userId]: state },
    }));
    sock("voice:state", state);
  },

  /* ─── Servers ─── */

  createServer(name, ownerId, icon, banner) {
    const serverId = id();
    const roleId = id();
    const catId = id();
    const chId = id();
    const memId = id();
    const newServer: Server = { id: serverId, name, icon, banner, ownerId, roleIds: [roleId], createdAt: Date.now() };
    const newRole: Role = { id: roleId, serverId, name: "Member", color: "#99aab5", permissions: 0xFF, position: 0 };
    const newCat: Channel = { id: catId, serverId, categoryId: null, name: "General", type: "category", position: 0, permissionOverrides: {} };
    const newCh: Channel = { id: chId, serverId, categoryId: catId, name: "general", type: "text", position: 0, permissionOverrides: {} };
    const newMem: Member = { id: memId, serverId, userId: ownerId, roleIds: [roleId], joinedAt: Date.now() };
    set((s) => ({
      servers: { ...s.servers, [serverId]: newServer },
      roles: { ...s.roles, [roleId]: newRole },
      channels: { ...s.channels, [catId]: newCat, [chId]: newCh },
      members: { ...s.members, [memId]: newMem },
    }));
    sock("server:create", {
      server: newServer,
      role: newRole,
      channels: [newCat, newCh],
      member: newMem,
    });
    return serverId;
  },

  updateServer(serverId, patch) {
    set((s) => {
      const sv = s.servers[serverId];
      if (!sv) return s;
      return { servers: { ...s.servers, [serverId]: { ...sv, ...patch } } };
    });
    sock("server:update", { serverId, patch });
  },

  deleteServer(serverId) {
    set((s) => {
      const servers = { ...s.servers };
      delete servers[serverId];
      const channels: typeof s.channels = {};
      for (const [k, c] of Object.entries(s.channels)) {
        if (c.serverId !== serverId) channels[k] = c;
      }
      const members: typeof s.members = {};
      for (const [k, m] of Object.entries(s.members)) {
        if (m.serverId !== serverId) members[k] = m;
      }
      const roles: typeof s.roles = {};
      for (const [k, r] of Object.entries(s.roles)) {
        if (r.serverId !== serverId) roles[k] = r;
      }
      return { servers, channels, members, roles, selectedServerId: s.selectedServerId === serverId ? null : s.selectedServerId };
    });
    sock("server:delete", { serverId });
  },

  createChannel(serverId, name, type, categoryId) {
    const channelId = id();
    const existing = Object.values(get().channels).filter((c) => c.serverId === serverId && c.type === type);
    const ch: Channel = { id: channelId, serverId, categoryId, name, type, position: existing.length, permissionOverrides: {} };
    set((s) => ({ channels: { ...s.channels, [channelId]: ch } }));
    sock("channel:create", ch);
    return channelId;
  },

  deleteChannel(channelId) {
    set((s) => {
      const ch = s.channels[channelId];
      if (!ch) return s;
      const channels = { ...s.channels };
      if (ch.type === "category") {
        for (const [k, c] of Object.entries(channels)) {
          if (c.categoryId === channelId) delete channels[k];
        }
      }
      delete channels[channelId];
      return { channels, selectedChannelId: s.selectedChannelId === channelId ? null : s.selectedChannelId };
    });
    sock("channel:delete", { channelId });
  },

  /* ─── Custom emojis / stickers ─── */

  addCustomEmoji(serverId, name, url) {
    const s = get().servers[serverId];
    if (!s) return false;
    const emojis = s.customEmojis ?? [];
    if (emojis.length >= 250) return false;
    const emoji: CustomEmoji = { id: id(), serverId, name, url, createdAt: Date.now() };
    get().updateServer(serverId, { customEmojis: [...emojis, emoji] });
    return true;
  },

  removeCustomEmoji(serverId, emojiId) {
    const s = get().servers[serverId];
    if (!s) return;
    get().updateServer(serverId, { customEmojis: (s.customEmojis ?? []).filter((e) => e.id !== emojiId) });
  },

  addCustomSticker(serverId, name, url) {
    const s = get().servers[serverId];
    if (!s) return false;
    const stickers = s.customStickers ?? [];
    if (stickers.length >= 250) return false;
    const sticker: CustomSticker = { id: id(), serverId, name, url, createdAt: Date.now() };
    get().updateServer(serverId, { customStickers: [...stickers, sticker] });
    return true;
  },

  removeCustomSticker(serverId, stickerId) {
    const s = get().servers[serverId];
    if (!s) return;
    get().updateServer(serverId, { customStickers: (s.customStickers ?? []).filter((st) => st.id !== stickerId) });
  },

  /* ─── Roles ─── */

  updateRole(roleId, patch) {
    set((s) => {
      const r = s.roles[roleId];
      if (!r) return s;
      return { roles: { ...s.roles, [roleId]: { ...r, ...patch } } };
    });
    sock("role:update", { roleId, patch });
  },

  addMemberRole(memberId, roleId) {
    set((s) => {
      const m = s.members[memberId];
      if (!m || m.roleIds.includes(roleId)) return s;
      return { members: { ...s.members, [memberId]: { ...m, roleIds: [...m.roleIds, roleId] } } };
    });
    sock("member:addRole", { memberId, roleId });
  },

  removeMemberRole(memberId, roleId) {
    set((s) => {
      const m = s.members[memberId];
      if (!m) return s;
      return { members: { ...s.members, [memberId]: { ...m, roleIds: m.roleIds.filter((r) => r !== roleId) } } };
    });
    sock("member:removeRole", { memberId, roleId });
  },

  /* ─── DMs ─── */

  getOrCreateDM(userId, currentUserId) {
    const state = get();
    const participants = [currentUserId, userId].sort();
    const existing = Object.values(state.dmChannels).find(
      (dm) => dm.type === "dm" && dm.participantIds.slice().sort().join(",") === participants.join(",")
    );
    if (existing) return existing.id;
    const dmId = id();
    const dm: DMChannel = {
      id: dmId,
      type: "dm",
      participantIds: [currentUserId, userId],
      createdAt: Date.now(),
    };
    set((s) => ({ dmChannels: { ...s.dmChannels, [dmId]: dm } }));
    sock("dm:create", dm);
    return dmId;
  },

  /* ─── Server join ─── */

  joinServer(serverId, userId) {
    const st = get();
    const already = Object.values(st.members).some(
      (m) => m.serverId === serverId && m.userId === userId
    );
    if (already) return;
    sock("server:join", { serverId, userId });
  },
}));
