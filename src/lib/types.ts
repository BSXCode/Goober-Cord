// ============ PERMISSIONS ============
export const PERMISSIONS = {
  MANAGE_SERVER: 1 << 0,
  MANAGE_CHANNELS: 1 << 1,
  MANAGE_ROLES: 1 << 2,
  MANAGE_MESSAGES: 1 << 3,
  READ_MESSAGES: 1 << 4,
  SEND_MESSAGES: 1 << 5,
  ATTACH_FILES: 1 << 6,
  MENTION_EVERYONE: 1 << 7,
} as const;

export type PermissionFlag = keyof typeof PERMISSIONS;

export function hasPermission(allow: number, perm: number): boolean {
  return (allow & perm) === perm;
}

export function grantPermission(allow: number, perm: number): number {
  return allow | perm;
}

export function revokePermission(allow: number, perm: number): number {
  return allow & ~perm;
}

// ============ PRESENCE ============
export type PresenceStatus = "online" | "idle" | "dnd" | "offline";

export interface Presence {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
  lastSeen: number;
}

// ============ USERS & AUTH ============
export type ProfileTheme = "default" | "midnight" | "sunset" | "forest" | "ocean" | "rose" | "neon";
export type NameplateStyle = "default" | "gradient" | "glow" | "outlined" | "rainbow";
export type AvatarDecoration = "none" | "ring-gold" | "ring-blue" | "ring-red" | "ring-green" | "ring-rainbow" | "sparkle" | "flame";
export type ProfileEffect = "none" | "particles" | "confetti" | "hearts" | "snow";

export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  presence: PresenceStatus;
  customStatus?: string;
  favoriteGifIds?: string[];
  favoriteGifs?: { id: string; url: string }[];
  badges?: string[];
  widget?: string;
  profileTheme?: ProfileTheme;
  nameplate?: NameplateStyle;
  nameColor?: string;
  avatarDecoration?: AvatarDecoration;
  profileEffect?: ProfileEffect;
  pronouns?: string;
  friends?: string[];
  friendRequests?: { fromUserId: string; timestamp: number }[];
}

export interface AuthUser extends User {
  passwordHash: string; // stored as simple hash for demo (btoa in real app use proper hashing)
}

// ============ ROLES ============
export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string; // hex
  permissions: number; // bitmask
  position: number;
}

// ============ CUSTOM EMOJI / STICKERS ============
export interface CustomEmoji {
  id: string;
  serverId: string;
  name: string;   // short name e.g. "pepe"
  url: string;     // data URL or hosted URL
  createdAt: number;
}

export interface CustomSticker {
  id: string;
  serverId: string;
  name: string;
  url: string;
  createdAt: number;
}

// ============ SOUNDBOARD ============
export interface SoundboardSound {
  id: string;
  name: string;
  url: string; // data URL
  size: number;
}

// ============ SERVERS ============
export interface Server {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  ownerId: string;
  roleIds: string[];
  customEmojis?: CustomEmoji[];
  customStickers?: CustomSticker[];
  soundboard?: SoundboardSound[];
  description?: string;
  welcomeMessage?: string;
  defaultNotifications?: "all" | "mentions";
  nsfw?: boolean;
  accentColor?: string;
  createdAt: number;
}

// ============ CHANNELS ============
export type ChannelType = "text" | "voice" | "category";

export interface Channel {
  id: string;
  serverId: string;
  categoryId: string | null; // null = no category
  name: string;
  type: ChannelType;
  position: number;
  permissionOverrides: Record<string, { allow: number; deny: number }>; // roleId -> { allow, deny }
}

// ============ MEMBERS ============
export interface Member {
  id: string;
  serverId: string;
  userId: string;
  roleIds: string[];
  nickname?: string;
  joinedAt: number;
}

// ============ MESSAGES ============
export interface ServerInvite {
  serverId: string;
  serverName: string;
  serverIcon?: string;
  serverBanner?: string;
  memberCount: number;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  edited: boolean;
  replyToId: string | null;
  threadId: string | null;
  attachments: MessageAttachment[];
  embeds?: MessageEmbed[];
  invite?: ServerInvite;
  reactions: Record<string, string[]>; // emoji -> userId[]
  pinned: boolean;
}

export interface MessageEmbed {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string; // data URL for demo
  size: number;
  contentType: string;
}

// ============ THREADS ============
export interface Thread {
  id: string;
  channelId: string;
  rootMessageId: string;
  name: string;
  createdAt: number;
  archivedAt: number | null;
  messageIds: string[];
}

// ============ DMs ============
export type DMType = "dm" | "group";

export interface DMChannel {
  id: string;
  type: DMType;
  name?: string; // group name
  participantIds: string[];
  createdAt: number;
}

// ============ VOICE ============
export interface VoiceState {
  userId: string;
  channelId: string | null;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
}

// ============ READ STATE ============
export interface ReadState {
  channelId: string;
  userId: string;
  lastMessageId: string | null;
  lastReadAt: number;
}

// ============ TYPING ============
export interface TypingIndicator {
  channelId: string;
  userId: string;
  startedAt: number;
}
