const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "goobercord.json");
const ENC_MAGIC = Buffer.from("GCENC", "utf8");
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY;
  if (!raw) return null;
  const s = raw.trim();
  if (s.length === 64 && /^[0-9a-fA-F]+$/.test(s)) {
    return Buffer.from(s, "hex");
  }
  return crypto.scryptSync(s, "goobercord-db-salt", KEY_LEN);
}

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([ENC_MAGIC, iv, tag, enc]);
}

function decrypt(buffer, key) {
  if (buffer.length < ENC_MAGIC.length + IV_LEN + TAG_LEN) return null;
  const iv = buffer.subarray(ENC_MAGIC.length, ENC_MAGIC.length + IV_LEN);
  const tag = buffer.subarray(ENC_MAGIC.length + IV_LEN, ENC_MAGIC.length + IV_LEN + TAG_LEN);
  const enc = buffer.subarray(ENC_MAGIC.length + IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

const EMPTY = {
  users: {},
  servers: {},
  channels: {},
  members: {},
  messages: {},
  threads: {},
  roles: {},
  dmChannels: {},
  readStates: {},
  voiceStates: {},
};

class DB {
  constructor() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    this.data = this._load();
    this._dirty = false;
    this._saveTimer = null;
  }

  _load() {
    const key = getEncryptionKey();
    try {
      if (fs.existsSync(DB_FILE)) {
        const buf = fs.readFileSync(DB_FILE);
        let raw;
        if (key && buf.length >= ENC_MAGIC.length && buf.subarray(0, ENC_MAGIC.length).equals(ENC_MAGIC)) {
          raw = decrypt(buf, key);
          if (!raw) throw new Error("Decryption failed");
        } else {
          raw = typeof buf === "string" ? buf : buf.toString("utf8");
        }
        const parsed = JSON.parse(raw);
        return { ...JSON.parse(JSON.stringify(EMPTY)), ...parsed };
      }
    } catch (e) {
      console.error("[DB] load error:", e.message);
    }
    return JSON.parse(JSON.stringify(EMPTY));
  }

  _scheduleSave() {
    this._dirty = true;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      if (!this._dirty) return;
      this._dirty = false;
      try {
        const key = getEncryptionKey();
        const json = JSON.stringify(this.data);
        if (key) {
          fs.writeFileSync(DB_FILE, encrypt(json, key));
        } else {
          fs.writeFileSync(DB_FILE, json, "utf8");
        }
      } catch (e) {
        console.error("[DB] save error:", e.message);
      }
    }, 500);
  }

  save() {
    this._scheduleSave();
  }

  getState() {
    return this.data;
  }

  getRecentMessages(channelId, limit = 100) {
    const all = Object.values(this.data.messages)
      .filter((m) => m.channelId === channelId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return all;
  }

  getUser(id) {
    return this.data.users[id] || null;
  }

  getUserByUsername(username) {
    return (
      Object.values(this.data.users).find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      ) || null
    );
  }

  addUser(user) {
    this.data.users[user.id] = user;
    this.save();
  }

  updateUser(id, patch) {
    if (!this.data.users[id]) return null;
    Object.assign(this.data.users[id], patch);
    this.save();
    return this.data.users[id];
  }

  addServer(server) {
    this.data.servers[server.id] = server;
    this.save();
  }

  updateServer(id, patch) {
    if (!this.data.servers[id]) return null;
    Object.assign(this.data.servers[id], patch);
    this.save();
    return this.data.servers[id];
  }

  deleteServer(id) {
    delete this.data.servers[id];
    for (const [k, v] of Object.entries(this.data.channels)) {
      if (v.serverId === id) delete this.data.channels[k];
    }
    for (const [k, v] of Object.entries(this.data.members)) {
      if (v.serverId === id) delete this.data.members[k];
    }
    for (const [k, v] of Object.entries(this.data.roles)) {
      if (v.serverId === id) delete this.data.roles[k];
    }
    this.save();
  }

  addChannel(ch) {
    this.data.channels[ch.id] = ch;
    this.save();
  }

  deleteChannel(id) {
    const ch = this.data.channels[id];
    if (ch && ch.type === "category") {
      for (const [k, v] of Object.entries(this.data.channels)) {
        if (v.categoryId === id) delete this.data.channels[k];
      }
    }
    delete this.data.channels[id];
    this.save();
  }

  addMember(member) {
    this.data.members[member.id] = member;
    this.save();
  }

  removeMember(id) {
    delete this.data.members[id];
    this.save();
  }

  addMessage(msg) {
    this.data.messages[msg.id] = msg;
    this.save();
  }

  updateMessage(id, patch) {
    if (!this.data.messages[id]) return null;
    Object.assign(this.data.messages[id], patch);
    this.save();
    return this.data.messages[id];
  }

  deleteMessage(id) {
    delete this.data.messages[id];
    this.save();
  }

  addRole(role) {
    this.data.roles[role.id] = role;
    this.save();
  }

  updateRole(id, patch) {
    if (!this.data.roles[id]) return null;
    Object.assign(this.data.roles[id], patch);
    this.save();
    return this.data.roles[id];
  }

  addDM(dm) {
    this.data.dmChannels[dm.id] = dm;
    this.save();
  }

  addThread(thread) {
    this.data.threads[thread.id] = thread;
    this.save();
  }

  updateThread(id, patch) {
    if (!this.data.threads[id]) return null;
    Object.assign(this.data.threads[id], patch);
    this.save();
    return this.data.threads[id];
  }

  setReadState(key, state) {
    this.data.readStates[key] = state;
    this.save();
  }

  setVoiceState(userId, state) {
    if (state) {
      this.data.voiceStates[userId] = state;
    } else {
      delete this.data.voiceStates[userId];
    }
    this.save();
  }
}

module.exports = new DB();
