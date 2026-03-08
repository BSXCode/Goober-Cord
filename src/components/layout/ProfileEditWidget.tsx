"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import {
  X, GripHorizontal, Camera, ImageIcon, Pencil,
} from "lucide-react";
import type { PresenceStatus, ProfileTheme, NameplateStyle, AvatarDecoration, ProfileEffect } from "@/lib/types";

const ACCEPT_IMAGE = "image/png,image/jpeg,image/gif,image/webp";

const THEME_GRADIENTS: Record<ProfileTheme, string> = {
  default: "linear-gradient(135deg, #5865f2, #eb459e)",
  midnight: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  sunset: "linear-gradient(135deg, #ff6b6b, #feca57, #ff9a9e)",
  forest: "linear-gradient(135deg, #134e5e, #71b280)",
  ocean: "linear-gradient(135deg, #0052d4, #4364f7, #6fb1fc)",
  rose: "linear-gradient(135deg, #ee9ca7, #ffdde1, #ff006e)",
  neon: "linear-gradient(135deg, #7b2ff7, #00f5d4, #f72fff)",
};

const PROFILE_THEMES: { value: ProfileTheme; label: string; colors: string }[] = [
  { value: "default", label: "Default", colors: "#5865f2, #eb459e" },
  { value: "midnight", label: "Midnight", colors: "#1a1a2e, #16213e" },
  { value: "sunset", label: "Sunset", colors: "#ff6b6b, #feca57" },
  { value: "forest", label: "Forest", colors: "#2d6a4f, #95d5b2" },
  { value: "ocean", label: "Ocean", colors: "#023e8a, #48cae4" },
  { value: "rose", label: "Rose", colors: "#ff006e, #fb5607" },
  { value: "neon", label: "Neon", colors: "#7b2ff7, #00f5d4" },
];

const NAMEPLATE_STYLES: { value: NameplateStyle; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "gradient", label: "Gradient" },
  { value: "glow", label: "Glow" },
  { value: "outlined", label: "Outlined" },
  { value: "rainbow", label: "Rainbow" },
];

const AVATAR_DECORATIONS: { value: AvatarDecoration; label: string; style: string }[] = [
  { value: "none", label: "None", style: "" },
  { value: "ring-gold", label: "Gold Ring", style: "ring-2 ring-[#faa61a] ring-offset-2 ring-offset-[#1e1f22]" },
  { value: "ring-blue", label: "Blue Ring", style: "ring-2 ring-[#5865f2] ring-offset-2 ring-offset-[#1e1f22]" },
  { value: "ring-red", label: "Red Ring", style: "ring-2 ring-[#ed4245] ring-offset-2 ring-offset-[#1e1f22]" },
  { value: "ring-green", label: "Green Ring", style: "ring-2 ring-[#23a559] ring-offset-2 ring-offset-[#1e1f22]" },
  { value: "ring-rainbow", label: "Rainbow Ring", style: "ring-2 ring-offset-2 ring-offset-[#1e1f22] animate-rainbow-ring" },
  { value: "sparkle", label: "Sparkle", style: "ring-2 ring-[#feca57] ring-offset-2 ring-offset-[#1e1f22] animate-pulse" },
  { value: "flame", label: "Flame", style: "ring-2 ring-[#ff6b6b] ring-offset-2 ring-offset-[#1e1f22] shadow-[0_0_12px_#ff6b6b]" },
];

const PROFILE_EFFECTS: { value: ProfileEffect; label: string; emoji: string }[] = [
  { value: "none", label: "None", emoji: "" },
  { value: "particles", label: "Particles", emoji: "✨" },
  { value: "confetti", label: "Confetti", emoji: "🎊" },
  { value: "hearts", label: "Hearts", emoji: "💕" },
  { value: "snow", label: "Snow", emoji: "❄️" },
];
const STATUS_OPTIONS: { value: PresenceStatus; label: string; color: string }[] = [
  { value: "online", label: "Online", color: "#23a559" },
  { value: "idle", label: "Idle", color: "#faa61a" },
  { value: "dnd", label: "Do Not Disturb", color: "#f23f42" },
  { value: "offline", label: "Invisible", color: "#80848e" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfileEditWidget({ open, onClose }: Props) {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const updateUser = useAppStore((s) => s.updateUser);
  const setPresence = useAppStore((s) => s.setPresence);
  const presence = useAppStore((s) => s.presence);

  const user = currentUserId ? users[currentUserId] : null;

  const [bio, setBio] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [status, setStatus] = useState<PresenceStatus>("online");
  const [badges, setBadges] = useState<string[]>([]);
  const [widget, setWidget] = useState("");
  const [newBadge, setNewBadge] = useState("");
      const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
      const [pendingBanner, setPendingBanner] = useState<string | null>(null);
      const [profileTheme, setProfileTheme] = useState<ProfileTheme>("default");
      const [nameplate, setNameplate] = useState<NameplateStyle>("default");
      const [nameColor, setNameColor] = useState("#ffffff");
      const [avatarDeco, setAvatarDeco] = useState<AvatarDecoration>("none");
      const [profileEffect, setProfileEffect] = useState<ProfileEffect>("none");
      const [pronouns, setPronouns] = useState("");
      const [saved, setSaved] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open && position.x === -1) {
      setPosition({
        x: Math.max(20, (window.innerWidth - 400) / 2),
        y: Math.max(20, (window.innerHeight - 560) / 2),
      });
    }
  }, [open, position.x]);

  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current && user && currentUserId) {
      setBio(user.bio ?? "");
      setCustomStatus(user.customStatus ?? presence[currentUserId]?.customStatus ?? "");
      setStatus((presence[currentUserId]?.status as PresenceStatus) ?? user.presence ?? "online");
      setBadges(user.badges ?? []);
      setWidget(user.widget ?? "");
      setPendingAvatar(null);
      setPendingBanner(null);
      setProfileTheme(user.profileTheme ?? "default");
      setNameplate(user.nameplate ?? "default");
      setNameColor(user.nameColor ?? "#ffffff");
      setAvatarDeco(user.avatarDecoration ?? "none");
      setProfileEffect(user.profileEffect ?? "none");
      setPronouns(user.pronouns ?? "");
      setSaved(false);
    }
    prevOpen.current = open;
  }, [open, user, currentUserId, presence]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    },
    [position]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingAvatar(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingBanner(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = () => {
    if (!currentUserId) return;
                updateUser(currentUserId, {
                  avatar: pendingAvatar ?? user?.avatar,
                  banner: pendingBanner ?? user?.banner,
                  bio: bio.trim() || undefined,
                  customStatus: customStatus.trim() || undefined,
                  presence: status,
                  badges: badges.length ? badges : undefined,
                  widget: widget.trim() || undefined,
                  profileTheme,
                  nameplate,
                  nameColor,
                  avatarDecoration: avatarDeco,
                  profileEffect,
                  pronouns: pronouns.trim() || undefined,
                });
    setPresence(currentUserId, status, customStatus.trim() || undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addBadge = () => {
    const t = newBadge.trim().slice(0, 20);
    if (t && badges.length < 5) setBadges((b) => [...b, t]);
    setNewBadge("");
  };

  if (!open || !user || typeof document === "undefined") return null;

  const avatarSrc = pendingAvatar ?? user.avatar;
  const bannerSrc = pendingBanner ?? user.banner;

  const content = (
    <div className="fixed z-[9998] select-none" style={{ left: position.x, top: position.y }}>
      <div className="w-[400px] rounded-2xl bg-[#1e1f22] border border-[#3f4147] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Title bar */}
        <div
          className="h-9 flex items-center justify-between px-3 bg-[#111214] cursor-grab active:cursor-grabbing flex-shrink-0"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-[#949ba4]" />
            <Pencil className="w-3 h-3 text-[#949ba4]" />
            <span className="text-xs font-medium text-[#dbdee1]">Edit Profile</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#949ba4] hover:text-white hover:bg-[#3f4147]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {/* Banner */}
          <div className="relative h-28 bg-[#2b2d31] group">
            {bannerSrc ? (
              <img src={bannerSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: THEME_GRADIENTS[profileTheme] || THEME_GRADIENTS.default }} />
            )}
            <input ref={bannerInputRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={handleBannerChange} />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ImageIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Avatar overlapping banner */}
          <div className="relative px-4 -mt-10">
            <div className="relative w-20 h-20 rounded-full border-4 border-[#1e1f22] overflow-hidden bg-[#5865f2] group">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-white text-2xl font-medium">
                  {user.username[0].toUpperCase()}
                </span>
              )}
              <input ref={avatarInputRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={handleAvatarChange} />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="mt-1 text-white font-semibold text-base">{user.username}<span className="text-[#949ba4] font-normal">#{user.discriminator}</span></p>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Status</label>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      status === opt.value ? "bg-[#3f4147] text-white" : "text-[#949ba4] hover:text-white hover:bg-[#2b2d31]"
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom status */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Custom Status</label>
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={128}
                className="w-full px-3 py-2 rounded-lg bg-[#2b2d31] border border-[#3f4147] text-white placeholder-[#4e5058] text-sm focus:border-[#5865f2] focus:outline-none"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">About Me</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself"
                maxLength={190}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#2b2d31] border border-[#3f4147] text-white placeholder-[#4e5058] text-sm focus:border-[#5865f2] focus:outline-none resize-none"
              />
              <p className="text-[10px] text-[#4e5058] mt-0.5 text-right">{bio.length}/190</p>
            </div>

            {/* Badges */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Badges</label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {badges.map((b, i) => {
                  const isProtected = b === "🛠️ Developer" || b === "👑 Site Owner";
                  return (
                    <span key={i} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white", isProtected ? "bg-[#faa61a]/30 border border-[#faa61a]/40" : "bg-[#5865f2]/20")}>
                      {b}
                      {!isProtected && (
                        <button type="button" onClick={() => setBadges((prev) => prev.filter((_, j) => j !== i))} className="hover:text-red-400 text-[10px]">x</button>
                      )}
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBadge())}
                  placeholder="Add badge (emoji or text)"
                  maxLength={20}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#2b2d31] border border-[#3f4147] text-white placeholder-[#4e5058] text-xs focus:border-[#5865f2] focus:outline-none"
                />
                <button type="button" onClick={addBadge} disabled={!newBadge.trim() || badges.length >= 5} className="px-2.5 py-1.5 rounded-lg bg-[#3f4147] text-white text-xs disabled:opacity-40">Add</button>
              </div>
            </div>

            {/* Widget text */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Activity</label>
              <input
                type="text"
                value={widget}
                onChange={(e) => setWidget(e.target.value)}
                placeholder="e.g. Playing Goober-Cord"
                maxLength={64}
                className="w-full px-3 py-2 rounded-lg bg-[#2b2d31] border border-[#3f4147] text-white placeholder-[#4e5058] text-sm focus:border-[#5865f2] focus:outline-none"
              />
            </div>

            {/* Profile Theme */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Profile Theme</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PROFILE_THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setProfileTheme(t.value)}
                    className={cn(
                      "h-8 rounded-lg border-2 transition-all text-[10px] font-medium text-white",
                      profileTheme === t.value ? "border-white scale-105" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                    style={{ background: `linear-gradient(135deg, ${t.colors})` }}
                    title={t.label}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Color */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Name Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={nameColor} onChange={(e) => setNameColor(e.target.value)}
                  className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
                <span className="text-sm font-semibold" style={{ color: nameColor }}>{user.username}</span>
              </div>
            </div>

            {/* Nameplate Style */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Nameplate Style</label>
              <div className="flex flex-wrap gap-1.5">
                {NAMEPLATE_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setNameplate(s.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      nameplate === s.value ? "bg-[#5865f2] text-white" : "bg-[#2b2d31] text-[#949ba4] hover:text-white hover:bg-[#3f4147]"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Decoration */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Avatar Decoration</label>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_DECORATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setAvatarDeco(d.value)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      avatarDeco === d.value ? "bg-[#5865f2] text-white" : "bg-[#2b2d31] text-[#949ba4] hover:text-white hover:bg-[#3f4147]"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Effect */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Profile Effect</label>
              <div className="flex flex-wrap gap-1.5">
                {PROFILE_EFFECTS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setProfileEffect(e.value)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      profileEffect === e.value ? "bg-[#5865f2] text-white" : "bg-[#2b2d31] text-[#949ba4] hover:text-white hover:bg-[#3f4147]"
                    )}
                  >
                    {e.emoji && <span className="mr-1">{e.emoji}</span>}{e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pronouns */}
            <div>
              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">Pronouns</label>
              <input
                type="text"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="e.g. he/him, she/her, they/them"
                maxLength={40}
                className="w-full px-3 py-2 rounded-lg bg-[#2b2d31] border border-[#3f4147] text-white placeholder-[#4e5058] text-sm focus:border-[#5865f2] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#111214] border-t border-[#3f4147] flex-shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-[#b5bac1] hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              saved ? "bg-[#23a559] text-white" : "bg-[#5865f2] hover:bg-[#4752c4] text-white"
            )}
          >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
