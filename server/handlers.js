const crypto = require("crypto");

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(SALT_LEN);
  else if (typeof salt === "string") salt = Buffer.from(salt, "hex");
  const hash = crypto.scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return { hash: hash.toString("hex"), salt: salt.toString("hex") };
}

function verifyPassword(password, passwordHash, passwordSalt) {
  if (passwordSalt) {
    const { hash } = hashPassword(password, passwordSalt);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(passwordHash, "hex"));
  }
  const legacyNew = legacySha256Hash(password);
  const legacyOld = legacyBase64Hash(password);
  return passwordHash === legacyNew || passwordHash === legacyOld;
}

function legacySha256Hash(password) {
  return crypto
    .createHash("sha256")
    .update(password + "goobercord-salt-v2")
    .digest("hex");
}

function legacyBase64Hash(password) {
  return Buffer.from(
    encodeURIComponent(password + "discord-clone-salt")
  ).toString("base64");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function rid() {
  return Math.random().toString(36).slice(2, 12);
}

const DEV_USERNAME = "CntrledShockTTV";
const DEV_BADGES = ["🛠️ Developer", "👑 Site Owner"];

function enforceDevBadges(user) {
  if (!user) return;
  if (user.username === DEV_USERNAME) {
    const existing = user.badges || [];
    const merged = [...DEV_BADGES];
    existing.forEach((b) => { if (!DEV_BADGES.includes(b)) merged.push(b); });
    if (JSON.stringify(existing) !== JSON.stringify(merged)) {
      user.badges = merged;
    }
  }
}

module.exports = function (io, db) {
  const connectedUsers = new Map();
  const sessions = new Map();
  const BETA_BADGE = "🧪 Beta Tester";

  // Grant beta badge to ALL existing accounts on server startup
  (() => {
    const users = db.getState().users;
    for (const u of Object.values(users)) {
      const badges = u.badges || [];
      if (!badges.includes(BETA_BADGE)) {
        db.updateUser(u.id, { badges: [...badges, BETA_BADGE] });
      }
    }
  })();

  function trackConnect(userId, socketId) {
    if (!connectedUsers.has(userId)) connectedUsers.set(userId, new Set());
    connectedUsers.get(userId).add(socketId);
  }

  function trackDisconnect(userId, socketId) {
    const sockets = connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) connectedUsers.delete(userId);
    }
  }

  function isOnline(userId) {
    return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
  }

  function presenceSnapshot() {
    const p = {};
    for (const [uid] of connectedUsers) {
      p[uid] = { status: "online" };
    }
    return p;
  }

  io.on("connection", (socket) => {
    let currentUserId = null;

    /* ─── Auth ────────────────────────────────────────── */

    socket.on("auth:signup", ({ username, password }, cb) => {
      const trimmed = (username || "").trim();
      if (!trimmed || trimmed.length < 2)
        return cb({ ok: false, error: "Username must be at least 2 characters" });
      if (!password || password.length < 4)
        return cb({ ok: false, error: "Password must be at least 4 characters" });

      if (db.getUserByUsername(trimmed))
        return cb({ ok: false, error: "Username already taken" });

      const { hash, salt } = hashPassword(password);
      const userId = "user-" + rid();
      const discriminator = String(Math.floor(1000 + Math.random() * 9000));
      const user = {
        id: userId,
        username: trimmed,
        discriminator,
        presence: "online",
        passwordHash: hash,
        passwordSalt: salt,
        badges: [BETA_BADGE],
        friends: [],
        friendRequests: [],
      };
      db.addUser(user);

      currentUserId = userId;
      trackConnect(userId, socket.id);

      const token = generateToken();
      sessions.set(token, userId);

      const { passwordHash: _, passwordSalt: __, ...safeUser } = user;
      socket.broadcast.emit("user:added", safeUser);

      cb({ ok: true, userId, token });
      sendSyncState(socket, userId);
    });

    socket.on("auth:login", ({ username, password }, cb) => {
      const trimmed = (username || "").trim();
      const users = db.getState().users;
      const found = Object.values(users).find(
        (u) => u.username.toLowerCase() === trimmed.toLowerCase()
      );
      if (!found || !verifyPassword(password, found.passwordHash, found.passwordSalt))
        return cb({ ok: false, error: "Invalid username or password" });

      if (!found.passwordSalt) {
        const { hash, salt } = hashPassword(password);
        db.updateUser(found.id, { passwordHash: hash, passwordSalt: salt });
      }

      enforceDevBadges(found);
      if (found.username === DEV_USERNAME) {
        db.updateUser(found.id, { badges: found.badges });
      }

      const currentBadges = found.badges || [];
      if (!currentBadges.includes(BETA_BADGE)) {
        found.badges = [...currentBadges, BETA_BADGE];
        db.updateUser(found.id, { badges: found.badges });
      }

      if (!found.friends) db.updateUser(found.id, { friends: [] });
      if (!found.friendRequests) db.updateUser(found.id, { friendRequests: [] });

      currentUserId = found.id;
      trackConnect(found.id, socket.id);

      const token = generateToken();
      sessions.set(token, found.id);

      cb({ ok: true, userId: found.id, token });
      sendSyncState(socket, found.id);
      io.emit("presence:update", { userId: found.id, status: "online" });
    });

    socket.on("auth:reconnect", ({ userId, token }, cb) => {
      if (token && sessions.has(token)) {
        const tokenUserId = sessions.get(token);
        if (tokenUserId !== userId) return cb({ ok: false });
      } else {
        const user = db.getUser(userId);
        if (!user) return cb({ ok: false });
        const newToken = generateToken();
        sessions.set(newToken, userId);
        cb({ ok: true, token: newToken });
        currentUserId = userId;
        trackConnect(userId, socket.id);
        sendSyncState(socket, userId);
        io.emit("presence:update", { userId, status: "online" });
        return;
      }

      currentUserId = userId;
      trackConnect(userId, socket.id);

      cb({ ok: true });
      sendSyncState(socket, userId);
      io.emit("presence:update", { userId, status: "online" });
    });

    function sendSyncState(sock, forUserId) {
      const state = JSON.parse(JSON.stringify(db.getState()));
      for (const uid of Object.keys(state.users)) {
        delete state.users[uid].passwordHash;
        delete state.users[uid].passwordSalt;
      }

      if (forUserId) {
        const userServerIds = new Set();
        for (const m of Object.values(state.members)) {
          if (m.userId === forUserId) userServerIds.add(m.serverId);
        }

        const userDmIds = new Set();
        for (const dm of Object.values(state.dmChannels)) {
          if (dm.participantIds && dm.participantIds.includes(forUserId)) {
            userDmIds.add(dm.id);
          }
        }

        const allowedChannelIds = new Set();
        for (const [cid, ch] of Object.entries(state.channels)) {
          if (userServerIds.has(ch.serverId)) allowedChannelIds.add(cid);
        }
        userDmIds.forEach((id) => allowedChannelIds.add(id));

        // Paginate: only last 100 messages per channel
        const msgsByChannel = {};
        for (const [mid, msg] of Object.entries(state.messages)) {
          if (!allowedChannelIds.has(msg.channelId)) continue;
          if (!msgsByChannel[msg.channelId]) msgsByChannel[msg.channelId] = [];
          msgsByChannel[msg.channelId].push(msg);
        }

        const filteredMessages = {};
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const [chId, msgs] of Object.entries(msgsByChannel)) {
          msgs.sort((a, b) => b.createdAt - a.createdAt);
          const recent = msgs.slice(0, 100);
          for (const msg of recent) {
            // Strip large attachment data from old messages to save bandwidth
            if (msg.createdAt < oneDayAgo && msg.attachments) {
              msg.attachments = msg.attachments.map((att) => {
                if (att.url && att.url.length > 500) {
                  return { ...att, url: att.url.slice(0, 100) + "...[truncated]" };
                }
                return att;
              });
            }
            filteredMessages[msg.id] = msg;
          }
        }
        state.messages = filteredMessages;

        const filteredDMs = {};
        for (const [did, dm] of Object.entries(state.dmChannels)) {
          if (userDmIds.has(did)) filteredDMs[did] = dm;
        }
        state.dmChannels = filteredDMs;
      }

      state._presence = presenceSnapshot();
      sock.emit("sync:state", state);
    }

    function requireAuth() {
      return currentUserId !== null;
    }

    /* ─── Rate Limiting ────────────────────────────────── */

    const rateLimits = new Map();

    function rateLimit(socket, action, limit, windowMs) {
      const key = `${socket.id}:${action}`;
      const now = Date.now();
      let entry = rateLimits.get(key);
      if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + windowMs };
        rateLimits.set(key, entry);
        return false;
      }
      entry.count++;
      if (entry.count > limit) return true;
      return false;
    }

    /* ─── Account ───────────────────────────────────────── */

    socket.on("account:changeUsername", ({ userId, newUsername }, cb) => {
      if (!requireAuth() || currentUserId !== userId) return cb({ ok: false, error: "Unauthorized" });
      if (!newUsername || newUsername.trim().length < 2)
        return cb({ ok: false, error: "Username must be at least 2 characters" });
      const trimmed = newUsername.trim();
      const existing = db.getUserByUsername(trimmed);
      if (existing && existing.id !== userId)
        return cb({ ok: false, error: "Username already taken" });
      db.updateUser(userId, { username: trimmed });
      const updated = db.getUser(userId);
      const { passwordHash: _, passwordSalt: __, ...safe } = updated;
      io.emit("user:updated", { userId, user: safe });
      cb({ ok: true });
    });

    socket.on("account:changePassword", ({ userId, newPassword }, cb) => {
      if (!requireAuth() || currentUserId !== userId) return cb({ ok: false, error: "Unauthorized" });
      if (!newPassword || newPassword.length < 3)
        return cb({ ok: false, error: "Password must be at least 3 characters" });
      const { hash, salt } = hashPassword(newPassword);
      db.updateUser(userId, { passwordHash: hash, passwordSalt: salt });
      cb({ ok: true });
    });

    socket.on("account:delete", ({ userId }, cb) => {
      if (!requireAuth() || currentUserId !== userId) return cb({ ok: false, error: "Unauthorized" });
      const user = db.getUser(userId);
      if (!user) return cb({ ok: false, error: "User not found" });

      // Remove user from all servers (delete their memberships)
      const state = db.getState();
      const memberIds = Object.keys(state.members).filter(
        (k) => state.members[k].userId === userId
      );
      memberIds.forEach((mid) => db.removeMember(mid));

      // Transfer or delete servers they own
      const ownedServers = Object.values(state.servers).filter(
        (s) => s.ownerId === userId
      );
      ownedServers.forEach((srv) => {
        db.deleteServer(srv.id);
        const channelIds = Object.keys(state.channels).filter(
          (k) => state.channels[k].serverId === srv.id
        );
        const mIds = Object.keys(state.members).filter(
          (k) => state.members[k].serverId === srv.id
        );
        const roleIds = Object.keys(state.roles).filter(
          (k) => state.roles[k].serverId === srv.id
        );
        io.emit("server:deleted", {
          serverId: srv.id,
          channelIds,
          memberIds: mIds,
          roleIds,
        });
      });

      // Delete user
      delete db.data.users[userId];
      db.save();

      // Disconnect all sockets for this user
      trackDisconnect(userId, socket.id);
      io.emit("user:removed", { userId });
      io.emit("presence:update", { userId, status: "offline" });

      cb({ ok: true });
    });

    /* ─── User ────────────────────────────────────────── */

    socket.on("user:update", ({ userId, patch }) => {
      if (!requireAuth()) return;
      const user = db.getUser(userId);
      if (!user) return;

      if (patch.badges && Array.isArray(patch.badges)) {
        if (user.username !== DEV_USERNAME) {
          patch.badges = patch.badges.filter((b) => !DEV_BADGES.includes(b));
        } else {
          const merged = [...DEV_BADGES];
          patch.badges.forEach((b) => { if (!DEV_BADGES.includes(b)) merged.push(b); });
          patch.badges = merged;
        }
      }

      const updated = db.updateUser(userId, patch);
      if (updated) {
        enforceDevBadges(updated);
        db.updateUser(userId, { badges: updated.badges });
        const { passwordHash: _, passwordSalt: __, ...safe } = updated;
        io.emit("user:updated", { userId, user: safe });
      }
    });

    socket.on("user:toggleFavGif", ({ userId, gif }) => {
      if (!requireAuth()) return;
      const u = db.getUser(userId);
      if (!u) return;
      const list = u.favoriteGifs || [];
      const exists = list.some((f) => f.id === gif.id);
      const next = exists ? list.filter((f) => f.id !== gif.id) : [...list, gif];
      db.updateUser(userId, { favoriteGifs: next });
      const updated = db.getUser(userId);
      const { passwordHash: _, passwordSalt: __, ...safe } = updated;
      io.emit("user:updated", { userId, user: safe });
    });

    /* ─── Friends ──────────────────────────────────────── */

    socket.on("friend:request", ({ fromUserId, toUserId }, cb) => {
      if (!requireAuth()) return cb?.({ ok: false, error: "Unauthorized" });
      if (rateLimit(socket, "friend:request", 3, 10000))
        return cb?.({ ok: false, error: "Rate limited, slow down!" });
      if (fromUserId === toUserId)
        return cb?.({ ok: false, error: "Cannot send a friend request to yourself" });

      const fromUser = db.getUser(fromUserId);
      const toUser = db.getUser(toUserId);
      if (!fromUser || !toUser)
        return cb?.({ ok: false, error: "User not found" });

      const friends = toUser.friends || [];
      if (friends.includes(fromUserId))
        return cb?.({ ok: false, error: "Already friends" });

      const pending = toUser.friendRequests || [];
      if (pending.some((r) => r.fromUserId === fromUserId))
        return cb?.({ ok: false, error: "Friend request already sent" });

      const reverseCheck = (fromUser.friendRequests || []).some((r) => r.fromUserId === toUserId);
      if (reverseCheck)
        return cb?.({ ok: false, error: "This user already sent you a request" });

      pending.push({ fromUserId, timestamp: Date.now() });
      db.updateUser(toUserId, { friendRequests: pending });

      const targetSockets = connectedUsers.get(toUserId);
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit("friend:request:new", { fromUserId, toUserId });
        }
      }

      cb?.({ ok: true });
    });

    socket.on("friend:accept", ({ userId, fromUserId }, cb) => {
      if (!requireAuth()) return cb?.({ ok: false, error: "Unauthorized" });

      const user = db.getUser(userId);
      const fromUser = db.getUser(fromUserId);
      if (!user || !fromUser)
        return cb?.({ ok: false, error: "User not found" });

      const requests = user.friendRequests || [];
      const idx = requests.findIndex((r) => r.fromUserId === fromUserId);
      if (idx === -1)
        return cb?.({ ok: false, error: "No pending request from this user" });

      requests.splice(idx, 1);
      const userFriends = user.friends || [];
      if (!userFriends.includes(fromUserId)) userFriends.push(fromUserId);
      db.updateUser(userId, { friendRequests: requests, friends: userFriends });

      const fromFriends = fromUser.friends || [];
      if (!fromFriends.includes(userId)) fromFriends.push(userId);
      db.updateUser(fromUserId, { friends: fromFriends });

      const notify = [userId, fromUserId];
      notify.forEach((uid) => {
        const sockets = connectedUsers.get(uid);
        if (sockets) {
          for (const sid of sockets) {
            io.to(sid).emit("friend:accepted", { userId, fromUserId });
          }
        }
      });

      cb?.({ ok: true });
    });

    socket.on("friend:decline", ({ userId, fromUserId }, cb) => {
      if (!requireAuth()) return cb?.({ ok: false, error: "Unauthorized" });

      const user = db.getUser(userId);
      if (!user)
        return cb?.({ ok: false, error: "User not found" });

      const requests = user.friendRequests || [];
      const idx = requests.findIndex((r) => r.fromUserId === fromUserId);
      if (idx === -1)
        return cb?.({ ok: false, error: "No pending request from this user" });

      requests.splice(idx, 1);
      db.updateUser(userId, { friendRequests: requests });

      const senderSockets = connectedUsers.get(fromUserId);
      if (senderSockets) {
        for (const sid of senderSockets) {
          io.to(sid).emit("friend:declined", { userId, fromUserId });
        }
      }

      cb?.({ ok: true });
    });

    socket.on("friend:remove", ({ userId, targetId }, cb) => {
      if (!requireAuth()) return cb?.({ ok: false, error: "Unauthorized" });

      const user = db.getUser(userId);
      const target = db.getUser(targetId);
      if (!user || !target)
        return cb?.({ ok: false, error: "User not found" });

      const userFriends = (user.friends || []).filter((id) => id !== targetId);
      db.updateUser(userId, { friends: userFriends });

      const targetFriends = (target.friends || []).filter((id) => id !== userId);
      db.updateUser(targetId, { friends: targetFriends });

      const notify = [userId, targetId];
      notify.forEach((uid) => {
        const sockets = connectedUsers.get(uid);
        if (sockets) {
          for (const sid of sockets) {
            io.to(sid).emit("friend:removed", { userId, targetId });
          }
        }
      });

      cb?.({ ok: true });
    });

    /* ─── Server CRUD ─────────────────────────────────── */

    socket.on("server:create", ({ server, role, channels, member }) => {
      if (!requireAuth()) return;
      db.addServer(server);
      db.addRole(role);
      channels.forEach((ch) => db.addChannel(ch));
      db.addMember(member);
      socket.broadcast.emit("server:added", { server, role, channels, member });
    });

    socket.on("server:update", ({ serverId, patch }) => {
      if (!requireAuth()) return;
      const updated = db.updateServer(serverId, patch);
      if (updated) {
        io.emit("server:updated", { serverId, server: updated });
      }
    });

    socket.on("server:delete", ({ serverId }) => {
      if (!requireAuth()) return;
      const channels = db.getState().channels;
      const members = db.getState().members;
      const roles = db.getState().roles;
      const channelIds = Object.keys(channels).filter((k) => channels[k].serverId === serverId);
      const memberIds = Object.keys(members).filter((k) => members[k].serverId === serverId);
      const roleIds = Object.keys(roles).filter((k) => roles[k].serverId === serverId);
      db.deleteServer(serverId);
      io.emit("server:deleted", { serverId, channelIds, memberIds, roleIds });
    });

    socket.on("server:join", ({ serverId, userId }) => {
      if (!requireAuth()) return;
      const st = db.getState();
      const already = Object.values(st.members).find(
        (m) => m.serverId === serverId && m.userId === userId
      );
      if (already) return;
      const server = st.servers[serverId];
      if (!server) return;

      const memId = rid();
      const member = {
        id: memId,
        serverId,
        userId,
        roleIds: server.roleIds.slice(0, 1),
        joinedAt: Date.now(),
      };
      db.addMember(member);
      io.emit("member:added", member);
    });

    socket.on("server:leave", ({ serverId, userId }) => {
      if (!requireAuth()) return;
      const st = db.getState();
      const server = st.servers[serverId];
      if (!server) return;
      if (server.ownerId === userId) return;
      const memberEntry = Object.values(st.members).find(
        (m) => m.serverId === serverId && m.userId === userId
      );
      if (!memberEntry) return;
      db.deleteMember(memberEntry.id);
      io.emit("member:removed", { memberId: memberEntry.id, serverId, userId });
    });

    /* ─── Channel CRUD ────────────────────────────────── */

    socket.on("channel:create", (ch) => {
      if (!requireAuth()) return;
      db.addChannel(ch);
      socket.broadcast.emit("channel:added", ch);
    });

    socket.on("channel:delete", ({ channelId }) => {
      if (!requireAuth()) return;
      const ch = db.getState().channels[channelId];
      const childIds =
        ch && ch.type === "category"
          ? Object.keys(db.getState().channels).filter(
              (k) => db.getState().channels[k].categoryId === channelId
            )
          : [];
      db.deleteChannel(channelId);
      io.emit("channel:deleted", { channelId, childIds });
    });

    socket.on("channel:reorder", ({ channelId, newPosition }) => {
      if (!requireAuth()) return;
      const ch = db.getState().channels[channelId];
      if (!ch) return;
      const updated = db.updateChannel(channelId, { position: newPosition });
      if (updated) io.emit("channel:updated", { channelId, channel: updated });
    });

    socket.on("channels:reorderBatch", ({ updates }) => {
      if (!requireAuth()) return;
      for (const { channelId, position } of updates) {
        const updated = db.updateChannel(channelId, { position });
        if (updated) io.emit("channel:updated", { channelId, channel: updated });
      }
    });

    /* ─── Messages ────────────────────────────────────── */

    async function processEmbeds(content) {
      const urls = content.match(/https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g) || [];
      const embeds = [];
      const seen = new Set();
      
      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);
        if (embeds.length >= 3) break; // Limit embeds

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout
          const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "bot" } });
          clearTimeout(timeout);
          
          if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) continue;
          
          const html = await res.text();
          const getMeta = (prop) => {
            const match = html.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]+)"`, "i"));
            return match ? match[1] : null; // No entity decoding for simplicity, but ideally should
          };

          const title = getMeta("og:title") || getMeta("twitter:title") || html.match(/<title>([^<]+)<\/title>/i)?.[1];
          const description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
          const image = getMeta("og:image") || getMeta("twitter:image");
          const site_name = getMeta("og:site_name");

          if (title || description || image) {
            embeds.push({ url, title, description, image, site_name });
          }
        } catch (e) {
          // Ignore fetch errors
        }
      }
      return embeds;
    }

    socket.on("message:send", async (msg) => {
      if (!requireAuth()) return;
      if (rateLimit(socket, "message:send", 5, 3000)) return;
      msg.createdAt = Date.now();
      
      // Process embeds
      if (msg.content) {
        msg.embeds = await processEmbeds(msg.content);
      }

      db.addMessage(msg);
      io.emit("message:new", msg);
    });

    socket.on("message:edit", ({ messageId, content }) => {
      if (!requireAuth()) return;
      const updated = db.updateMessage(messageId, {
        content,
        edited: true,
        updatedAt: Date.now(),
      });
      if (updated) socket.broadcast.emit("message:edited", updated);
    });

    socket.on("message:delete", ({ channelId, messageId }) => {
      if (!requireAuth()) return;
      db.deleteMessage(messageId);
      io.emit("message:deleted", { channelId, messageId });
    });

    socket.on("message:togglePin", ({ messageId }) => {
      if (!requireAuth()) return;
      const msg = db.getState().messages[messageId];
      if (!msg) return;
      const updated = db.updateMessage(messageId, { pinned: !msg.pinned });
      if (updated) io.emit("message:pinToggled", updated);
    });

    /* ─── Reactions ───────────────────────────────────── */

    socket.on("reaction:add", ({ messageId, emoji, userId }) => {
      if (rateLimit(socket, "reaction:add", 5, 3000)) return;
      const msg = db.getState().messages[messageId];
      if (!msg) return;
      const reactions = JSON.parse(JSON.stringify(msg.reactions || {}));
      const list = reactions[emoji] || [];
      if (list.includes(userId)) return;
      list.push(userId);
      reactions[emoji] = list;
      db.updateMessage(messageId, { reactions });
      socket.broadcast.emit("reaction:updated", { messageId, reactions });
    });

    socket.on("reaction:remove", ({ messageId, emoji, userId }) => {
      const msg = db.getState().messages[messageId];
      if (!msg) return;
      const reactions = JSON.parse(JSON.stringify(msg.reactions || {}));
      const list = (reactions[emoji] || []).filter((id) => id !== userId);
      if (list.length === 0) delete reactions[emoji];
      else reactions[emoji] = list;
      db.updateMessage(messageId, { reactions });
      socket.broadcast.emit("reaction:updated", { messageId, reactions });
    });

    /* ─── Typing ──────────────────────────────────────── */

    const typingTimers = new Map();

    socket.on("typing:start", ({ channelId, userId }) => {
      if (rateLimit(socket, "typing:start", 3, 2000)) return;
      socket.broadcast.emit("typing:start", { channelId, userId });
      const key = `${channelId}-${userId}`;
      if (typingTimers.has(key)) clearTimeout(typingTimers.get(key));
      typingTimers.set(
        key,
        setTimeout(() => {
          typingTimers.delete(key);
          socket.broadcast.emit("typing:stop", { channelId, userId });
        }, 8000)
      );
    });

    socket.on("typing:stop", ({ channelId, userId }) => {
      const key = `${channelId}-${userId}`;
      if (typingTimers.has(key)) {
        clearTimeout(typingTimers.get(key));
        typingTimers.delete(key);
      }
      socket.broadcast.emit("typing:stop", { channelId, userId });
    });

    /* ─── Presence ────────────────────────────────────── */

    socket.on("presence:set", ({ userId, status, customStatus }) => {
      db.updateUser(userId, { presence: status, customStatus });
      io.emit("presence:update", { userId, status, customStatus });
    });

    /* ─── Threads ─────────────────────────────────────── */

    socket.on("thread:reply", (msg) => {
      db.addMessage(msg);
      const thread = db.getState().threads[msg.threadId];
      if (thread) {
        db.updateThread(msg.threadId, {
          messageIds: [...thread.messageIds, msg.id],
        });
        socket.broadcast.emit(
          "thread:updated",
          db.getState().threads[msg.threadId]
        );
      }
      socket.broadcast.emit("message:new", msg);
    });

    socket.on("thread:archive", ({ threadId }) => {
      db.updateThread(threadId, { archivedAt: Date.now() });
      const t = db.getState().threads[threadId];
      if (t) io.emit("thread:updated", t);
    });

    /* ─── Voice / WebRTC ──────────────────────────────── */

    socket.on("voice:state", (state) => {
      db.setVoiceState(state.userId, state);
      io.emit("voice:state", state);
    });

    socket.on("webrtc:signal", ({ targetId, signal }) => {
      const targetSockets = connectedUsers.get(targetId);
      if (targetSockets) {
        for (const socketId of targetSockets) {
          io.to(socketId).emit("webrtc:signal", {
            userId: currentUserId,
            signal,
          });
        }
      }
    });

    /* ─── DMs ─────────────────────────────────────────── */

    socket.on("dm:create", (dm) => {
      db.addDM(dm);
      io.emit("dm:added", dm);
    });

    /* ─── Roles ───────────────────────────────────────── */

    socket.on("role:update", ({ roleId, patch }) => {
      const updated = db.updateRole(roleId, patch);
      if (updated) socket.broadcast.emit("role:updated", { roleId, role: updated });
    });

    socket.on("member:addRole", ({ memberId, roleId }) => {
      const m = db.getState().members[memberId];
      if (!m || m.roleIds.includes(roleId)) return;
      m.roleIds.push(roleId);
      db.save();
      socket.broadcast.emit("member:updated", { memberId, member: m });
    });

    socket.on("member:removeRole", ({ memberId, roleId }) => {
      const m = db.getState().members[memberId];
      if (!m) return;
      m.roleIds = m.roleIds.filter((r) => r !== roleId);
      db.save();
      socket.broadcast.emit("member:updated", { memberId, member: m });
    });

    /* ─── Soundboard ───────────────────────────────────── */

    socket.on("soundboard:add", ({ serverId, sound }, cb) => {
      const srv = db.getState().servers[serverId];
      if (!srv) return cb?.({ ok: false, error: "Server not found" });
      const sounds = srv.soundboard || [];
      if (sounds.length >= 50) return cb?.({ ok: false, error: "Soundboard full (50 max)" });
      sounds.push(sound);
      db.updateServer(serverId, { soundboard: sounds });
      io.emit("server:updated", { serverId, server: db.getState().servers[serverId] });
      cb?.({ ok: true });
    });

    socket.on("soundboard:remove", ({ serverId, soundId }) => {
      const srv = db.getState().servers[serverId];
      if (!srv) return;
      const sounds = (srv.soundboard || []).filter((s) => s.id !== soundId);
      db.updateServer(serverId, { soundboard: sounds });
      io.emit("server:updated", { serverId, server: db.getState().servers[serverId] });
    });

    socket.on("soundboard:play", ({ serverId, soundId }) => {
      socket.broadcast.emit("soundboard:play", { serverId, soundId });
    });

    /* ─── Read state ──────────────────────────────────── */

    socket.on("read:ack", ({ channelId, userId, lastMessageId }) => {
      const key = `${channelId}-${userId}`;
      db.setReadState(key, {
        channelId,
        userId,
        lastMessageId,
        lastReadAt: Date.now(),
      });
    });

    /* ─── Disconnect ──────────────────────────────────── */

    socket.on("disconnect", () => {
      for (const [key, timer] of typingTimers) {
        if (key.endsWith(`-${currentUserId}`)) {
          clearTimeout(timer);
          typingTimers.delete(key);
          const channelId = key.split("-").slice(0, -1).join("-");
          io.emit("typing:stop", { channelId, userId: currentUserId });
        }
      }

      if (currentUserId) {
        trackDisconnect(currentUserId, socket.id);
        if (!isOnline(currentUserId)) {
          io.emit("presence:update", {
            userId: currentUserId,
            status: "offline",
          });

          const vs = db.getState().voiceStates[currentUserId];
          if (vs && vs.channelId) {
            db.setVoiceState(currentUserId, null);
            io.emit("voice:state", {
              userId: currentUserId,
              channelId: null,
              muted: false,
              deafened: false,
              speaking: false,
            });
          }
        }

        for (const [token, uid] of sessions) {
          if (uid === currentUserId && !isOnline(currentUserId)) {
            // Keep token valid for reconnection
          }
        }
      }
    });
  });
};
