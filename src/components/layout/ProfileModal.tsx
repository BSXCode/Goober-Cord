"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import type { PresenceStatus } from "@/lib/types";

const ACCEPT_IMAGE = "image/png,image/jpeg,image/gif";
const STATUS_OPTIONS: { value: PresenceStatus; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "idle", label: "Idle" },
  { value: "dnd", label: "Do Not Disturb" },
  { value: "offline", label: "Offline" },
];

interface ProfileModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ userId, open, onClose }: ProfileModalProps) {
  const users = useAppStore((s) => s.users);
  const updateUser = useAppStore((s) => s.updateUser);
  const setPresence = useAppStore((s) => s.setPresence);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const user = users[userId];
  const presence = useAppStore((s) => s.presence);
  const [bio, setBio] = useState(user?.bio ?? "");
  const [customStatus, setCustomStatus] = useState(user?.customStatus ?? "");
  const [status, setStatus] = useState<PresenceStatus>(user?.presence ?? "online");
  const [badges, setBadges] = useState<string[]>(user?.badges ?? []);
  const [widget, setWidget] = useState(user?.widget ?? "");
  const [newBadge, setNewBadge] = useState("");
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setBio(user.bio ?? "");
      setCustomStatus(user.customStatus ?? presence[userId]?.customStatus ?? "");
      setStatus((presence[userId]?.status as PresenceStatus) ?? user.presence ?? "online");
      setBadges(user.badges ?? []);
      setWidget(user.widget ?? "");
      setPendingAvatar(null);
      setPendingBanner(null);
    }
  }, [open, user, userId, presence]);

  if (!open || !user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.match(/^image\/(png|jpeg|gif)$/i)) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.match(/^image\/(png|jpeg|gif)$/i)) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingBanner(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = () => {
    updateUser(userId, {
      avatar: pendingAvatar ?? user.avatar,
      banner: pendingBanner ?? user.banner,
      bio: bio.trim() || undefined,
      customStatus: customStatus.trim() || undefined,
      presence: status,
      badges: badges.length ? badges : undefined,
      widget: widget.trim() || undefined,
    });
    setPresence(userId, status, customStatus.trim() || undefined);
    onClose();
  };

  const handleCancel = () => {
    setPendingAvatar(null);
    setPendingBanner(null);
    onClose();
  };

  const addBadge = () => {
    const t = newBadge.trim().slice(0, 20);
    if (t && badges.length < 5) setBadges((b) => [...b, t]);
    setNewBadge("");
  };
  const removeBadge = (i: number) => setBadges((b) => b.filter((_, j) => j !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={handleCancel}>
      <div
        className="bg-[#313338] rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3f4147]">
          <h2 className="text-lg font-semibold text-white">Goober-Cord — Profile</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded text-[#b5bac1] hover:text-white hover:bg-[#3f4147]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {/* Banner */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Banner</label>
            <div className="relative h-24 rounded-lg bg-[#2b2d31] overflow-hidden border border-[#3f4147]">
              {(pendingBanner ?? user.banner) ? (
                <img src={pendingBanner ?? user.banner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#4e5058] text-sm">No banner</div>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept={ACCEPT_IMAGE}
                className="hidden"
                onChange={handleBannerChange}
              />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity text-white text-sm"
              >
                Change banner (PNG, JPEG, GIF)
              </button>
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Profile picture</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-[#5865f2] overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-2xl font-medium">
                {(pendingAvatar ?? user.avatar) ? (
                  <img src={pendingAvatar ?? user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.username.slice(0, 1).toUpperCase()
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept={ACCEPT_IMAGE}
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="px-3 py-1.5 rounded bg-[#3f4147] text-[#dbdee1] hover:bg-[#4e5058] text-sm"
              >
                Upload (PNG, JPEG, GIF)
              </button>
            </div>
          </div>

          {/* Username (read-only) */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Username</label>
            <p className="text-white font-medium">{user.username}#{user.discriminator}</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PresenceStatus)}
              className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white focus:border-[#5865f2] focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Custom status */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Custom status</label>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={128}
              className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself"
              maxLength={190}
              rows={3}
              className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none resize-none"
            />
            <p className="text-xs text-[#4e5058] mt-0.5">{bio.length}/190</p>
          </div>

          {/* Badges / Flair */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Badges & flair</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/30 text-sm text-white"
                >
                  {b}
                  <button type="button" onClick={() => removeBadge(i)} className="hover:text-red-400" aria-label="Remove">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBadge())}
                placeholder="Emoji or text (e.g. 🎮 or Pro)"
                maxLength={20}
                className="flex-1 px-3 py-1.5 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] text-sm focus:border-[#5865f2] focus:outline-none"
              />
              <button type="button" onClick={addBadge} disabled={!newBadge.trim() || badges.length >= 5} className="px-3 py-1.5 rounded bg-[#3f4147] text-white text-sm disabled:opacity-50">Add</button>
            </div>
            <p className="text-xs text-[#4e5058] mt-0.5">Up to 5 badges</p>
          </div>

          {/* Widget (e.g. "Playing ...") */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">Widget</label>
            <input
              type="text"
              value={widget}
              onChange={(e) => setWidget(e.target.value)}
              placeholder="e.g. Playing Goober-Cord"
              maxLength={64}
              className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3f4147]">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded text-[#b5bac1] hover:text-white hover:bg-[#3f4147]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
