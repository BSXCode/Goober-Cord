"use client";

import { io, Socket } from "socket.io-client";
import { useAppStore } from "./app-store";
import { useAuthStore } from "./auth-store";
import { playPing, playMessage, playJoin, playLeave, playReaction, playConnect, playSuccess } from "./sounds";
import { pushNotification } from "./notifications";

let socket: Socket | null = null;
let listenersAttached = false;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }

  socket = io({
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    transports: ["websocket", "polling"],
  });

  if (!listenersAttached) {
    attachListeners(socket);
    listenersAttached = true;
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    listenersAttached = false;
  }
}

function attachListeners(s: Socket) {
  s.on("connect", () => {
    const { currentUserId, sessionToken } = useAuthStore.getState();
    if (currentUserId) {
      s.emit("auth:reconnect", { userId: currentUserId, token: sessionToken }, (result: { ok: boolean; token?: string } | undefined) => {
        if (!result || !result.ok) {
          useAuthStore.getState().logout();
        } else if (result.token) {
          useAuthStore.setState({ sessionToken: result.token });
        }
      });
    }
  });

  s.on("disconnect", () => {
    useAppStore.setState({ synced: false });
  });

  s.on("connect_error", (err) => {
    console.error("[Socket] connection error:", err.message);
  });

  /* ─── Full state sync (initial load / reconnect) ─── */

  s.on("sync:state", (data: any) => {
    const presence = data._presence ?? {};
    delete data._presence;
    useAppStore.setState({
      users: data.users ?? {},
      servers: data.servers ?? {},
      channels: data.channels ?? {},
      members: data.members ?? {},
      messages: data.messages ?? {},
      threads: data.threads ?? {},
      roles: data.roles ?? {},
      dmChannels: data.dmChannels ?? {},
      readStates: data.readStates ?? {},
      voiceStates: data.voiceStates ?? {},
      presence,
      synced: true,
    });
  });

  /* ─── Users ─── */

  s.on("user:added", (user: any) => {
    useAppStore.setState((prev) => ({
      users: { ...prev.users, [user.id]: user },
    }));
  });

  s.on("user:updated", ({ userId, user }: { userId: string; user: any }) => {
    useAppStore.setState((prev) => ({
      users: { ...prev.users, [userId]: { ...prev.users[userId], ...user } },
    }));
  });

  s.on("user:removed", ({ userId }: { userId: string }) => {
    useAppStore.setState((prev) => {
      const users = { ...prev.users };
      delete users[userId];
      return { users };
    });
  });

  /* ─── Messages ─── */

  s.on("message:new", (msg: any) => {
    useAppStore.setState((prev) => ({
      messages: { ...prev.messages, [msg.id]: msg },
    }));

    const currentUserId = useAuthStore.getState().currentUserId;
    if (!currentUserId || msg.authorId === currentUserId) return;

    const mentionTag = `<@${currentUserId}>`;
    const author = useAppStore.getState().users[msg.authorId];
    const authorName = author?.username ?? "Someone";

    if (msg.content && msg.content.includes(mentionTag)) {
      playPing();
      pushNotification({
        type: "mention",
        title: `${authorName} mentioned you`,
        body: msg.content.slice(0, 80).replace(/<@[^>]+>/g, "@user"),
        icon: author?.avatar,
      });
      return;
    }

    const { dmChannels, selectedDMId } = useAppStore.getState();
    const isDM = msg.channelId && dmChannels[msg.channelId];
    if (isDM && selectedDMId !== msg.channelId) {
      playMessage();
      pushNotification({
        type: "dm",
        title: `${authorName}`,
        body: msg.content ? msg.content.slice(0, 80) : "Sent an attachment",
        icon: author?.avatar,
      });
    }
  });

  s.on("message:edited", (msg: any) => {
    useAppStore.setState((prev) => ({
      messages: { ...prev.messages, [msg.id]: msg },
    }));
  });

  s.on("message:deleted", ({ messageId }: { channelId: string; messageId: string }) => {
    useAppStore.setState((prev) => {
      const next = { ...prev.messages };
      delete next[messageId];
      return { messages: next };
    });
  });

  s.on("message:pinToggled", (msg: any) => {
    useAppStore.setState((prev) => ({
      messages: { ...prev.messages, [msg.id]: msg },
    }));
  });

  /* ─── Reactions ─── */

  s.on("reaction:updated", ({ messageId, reactions }: { messageId: string; reactions: any }) => {
    useAppStore.setState((prev) => {
      const msg = prev.messages[messageId];
      if (!msg) return prev;
      return {
        messages: { ...prev.messages, [messageId]: { ...msg, reactions } },
      };
    });
    playReaction();
  });

  /* ─── Typing ─── */

  s.on("typing:start", ({ channelId, userId }: { channelId: string; userId: string }) => {
    useAppStore.setState((prev) => {
      const next = new Map(prev.typing);
      const users = new Set(next.get(channelId) ?? []);
      users.add(userId);
      next.set(channelId, users);
      return { typing: next };
    });
  });

  s.on("typing:stop", ({ channelId, userId }: { channelId: string; userId: string }) => {
    useAppStore.setState((prev) => {
      const next = new Map(prev.typing);
      const users = new Set(next.get(channelId) ?? []);
      users.delete(userId);
      if (users.size === 0) next.delete(channelId);
      else next.set(channelId, users);
      return { typing: next };
    });
  });

  /* ─── Presence (batched) ─── */

  let presenceBatch: Record<string, any> = {};
  let presenceRaf = 0;

  s.on("presence:update", ({ userId, status, customStatus }: any) => {
    presenceBatch[userId] = { status, customStatus };
    if (!presenceRaf) {
      presenceRaf = requestAnimationFrame(() => {
        const batch = presenceBatch;
        presenceBatch = {};
        presenceRaf = 0;
        useAppStore.setState((prev) => ({
          presence: { ...prev.presence, ...batch },
        }));
      });
    }
  });

  /* ─── Servers ─── */

  s.on("server:added", ({ server, role, channels, member }: any) => {
    useAppStore.setState((prev) => {
      const newChannels = { ...prev.channels };
      (channels as any[]).forEach((ch) => {
        newChannels[ch.id] = ch;
      });
      return {
        servers: { ...prev.servers, [server.id]: server },
        roles: { ...prev.roles, [role.id]: role },
        channels: newChannels,
        members: { ...prev.members, [member.id]: member },
      };
    });
  });

  s.on("server:updated", ({ serverId, server }: any) => {
    useAppStore.setState((prev) => ({
      servers: { ...prev.servers, [serverId]: server },
    }));
  });

  s.on("server:deleted", ({ serverId, channelIds, memberIds, roleIds }: any) => {
    useAppStore.setState((prev) => {
      const servers = { ...prev.servers };
      delete servers[serverId];
      const channels = { ...prev.channels };
      (channelIds as string[]).forEach((id) => delete channels[id]);
      const members = { ...prev.members };
      (memberIds as string[]).forEach((id) => delete members[id]);
      const roles = { ...prev.roles };
      (roleIds as string[]).forEach((id) => delete roles[id]);
      return {
        servers,
        channels,
        members,
        roles,
        selectedServerId: prev.selectedServerId === serverId ? null : prev.selectedServerId,
      };
    });
  });

  /* ─── Channels ─── */

  s.on("channel:added", (ch: any) => {
    useAppStore.setState((prev) => ({
      channels: { ...prev.channels, [ch.id]: ch },
    }));
  });

  s.on("channel:deleted", ({ channelId, childIds }: { channelId: string; childIds: string[] }) => {
    useAppStore.setState((prev) => {
      const channels = { ...prev.channels };
      delete channels[channelId];
      childIds.forEach((id) => delete channels[id]);
      const affected = [channelId, ...childIds];
      return {
        channels,
        selectedChannelId: affected.includes(prev.selectedChannelId ?? "")
          ? null
          : prev.selectedChannelId,
      };
    });
  });

  s.on("channel:updated", ({ channelId, channel }: any) => {
    useAppStore.setState((prev) => ({
      channels: { ...prev.channels, [channelId]: channel },
    }));
  });

  /* ─── Members ─── */

  s.on("member:added", (member: any) => {
    useAppStore.setState((prev) => ({
      members: { ...prev.members, [member.id]: member },
    }));
  });

  s.on("member:updated", ({ memberId, member }: any) => {
    useAppStore.setState((prev) => ({
      members: { ...prev.members, [memberId]: member },
    }));
  });

  s.on("member:removed", ({ memberId, serverId, userId }: any) => {
    useAppStore.setState((prev) => {
      const { [memberId]: _, ...rest } = prev.members;
      const update: any = { members: rest };
      if (userId === useAuthStore.getState().currentUserId && prev.selectedServerId === serverId) {
        update.selectedServerId = null;
        update.selectedChannelId = null;
      }
      return update;
    });
  });

  /* ─── DMs ─── */

  s.on("dm:added", (dm: any) => {
    useAppStore.setState((prev) => ({
      dmChannels: { ...prev.dmChannels, [dm.id]: dm },
    }));
  });

  /* ─── Voice ─── */

  s.on("voice:state", (state: any) => {
    const prev = useAppStore.getState();
    const hadUser = !!prev.voiceStates[state.userId]?.channelId;
    const hasUser = !!state.channelId;
    useAppStore.setState((prev) => ({
      voiceStates: { ...prev.voiceStates, [state.userId]: state },
    }));
    if (!hadUser && hasUser) playJoin();
    else if (hadUser && !hasUser) playLeave();
  });

  /* ─── Threads ─── */

  s.on("thread:updated", (thread: any) => {
    useAppStore.setState((prev) => ({
      threads: { ...prev.threads, [thread.id]: thread },
    }));
  });

  /* ─── Roles ─── */

  s.on("role:updated", ({ roleId, role }: any) => {
    useAppStore.setState((prev) => ({
      roles: { ...prev.roles, [roleId]: role },
    }));
  });

  /* ─── Soundboard ─── */

  s.on("soundboard:play", ({ serverId, soundId }: { serverId: string; soundId: string }) => {
    const server = useAppStore.getState().servers[serverId];
    const sound = server?.soundboard?.find((s) => s.id === soundId);
    if (sound?.url) {
      try {
        const audio = new Audio(sound.url);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    }
  });

  /* ─── Friend Requests ─── */

  s.on("friend:request:new", ({ fromUserId }: { fromUserId: string }) => {
    const currentUserId = useAuthStore.getState().currentUserId;
    if (!currentUserId) return;
    const sender = useAppStore.getState().users[fromUserId];
    const senderName = sender?.username ?? "Someone";
    playPing();
    pushNotification({
      type: "friend_request",
      title: "Friend Request",
      body: `${senderName} sent you a friend request`,
      icon: sender?.avatar,
    });
    useAppStore.setState((prev) => {
      const user = prev.users[currentUserId];
      if (!user) return prev;
      const requests = [...(user.friendRequests ?? []), { fromUserId, timestamp: Date.now() }];
      return { users: { ...prev.users, [currentUserId]: { ...user, friendRequests: requests } } };
    });
  });

  s.on("friend:accepted", ({ userId, friendId }: { userId: string; friendId: string }) => {
    playSuccess();
    const currentUserId = useAuthStore.getState().currentUserId;
    const other = userId === currentUserId ? friendId : userId;
    const otherUser = useAppStore.getState().users[other];
    if (userId === currentUserId || friendId === currentUserId) {
      pushNotification({
        type: "info",
        title: "Friend Added",
        body: `You and ${otherUser?.username ?? "someone"} are now friends!`,
        icon: otherUser?.avatar,
      });
    }
    useAppStore.setState((prev) => {
      const next = { ...prev.users };
      [userId, friendId].forEach((uid) => {
        const u = next[uid];
        if (!u) return;
        const otherId = uid === userId ? friendId : userId;
        const existingFriends = u.friends ?? [];
        const friends = existingFriends.includes(otherId) ? existingFriends : [...existingFriends, otherId];
        const friendRequests = (u.friendRequests ?? []).filter((r) => r.fromUserId !== otherId);
        next[uid] = { ...u, friends, friendRequests };
      });
      return { users: next };
    });
  });

  s.on("friend:declined", ({ userId, fromUserId }: { userId: string; fromUserId: string }) => {
    useAppStore.setState((prev) => {
      const u = prev.users[userId];
      if (!u) return prev;
      const friendRequests = (u.friendRequests ?? []).filter((r) => r.fromUserId !== fromUserId);
      return { users: { ...prev.users, [userId]: { ...u, friendRequests } } };
    });
  });

  s.on("friend:removed", ({ userId, targetId }: { userId: string; targetId: string }) => {
    useAppStore.setState((prev) => {
      const next = { ...prev.users };
      [userId, targetId].forEach((uid) => {
        const u = next[uid];
        if (!u) return;
        const otherId = uid === userId ? targetId : userId;
        const friends = (u.friends ?? []).filter((f) => f !== otherId);
        next[uid] = { ...u, friends };
      });
      return { users: next };
    });
  });
}
