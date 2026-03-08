"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { MessageSquare, UserMinus, UserPlus, Pencil, X, Check } from "lucide-react";
import type { User, ProfileTheme, AvatarDecoration } from "@/lib/types";
import { getSocket } from "@/lib/socket";
import { pushNotification } from "@/lib/notifications";

const NICK_KEY = "gc-custom-nicknames";

function getNicknames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NICK_KEY) || "{}");
  } catch { return {}; }
}

function setNicknameLocal(userId: string, nick: string | null) {
  const nicks = getNicknames();
  if (nick) nicks[userId] = nick;
  else delete nicks[userId];
  localStorage.setItem(NICK_KEY, JSON.stringify(nicks));
}

export function getCustomNickname(userId: string): string | null {
  return getNicknames()[userId] ?? null;
}

const THEME_GRADIENTS: Record<ProfileTheme, string> = {
  default: "linear-gradient(135deg, #5865f2, #eb459e)",
  midnight: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  sunset: "linear-gradient(135deg, #ff6b6b, #feca57, #ff9a9e)",
  forest: "linear-gradient(135deg, #134e5e, #71b280)",
  ocean: "linear-gradient(135deg, #0052d4, #4364f7, #6fb1fc)",
  rose: "linear-gradient(135deg, #ee9ca7, #ffdde1, #ff006e)",
  neon: "linear-gradient(135deg, #7b2ff7, #00f5d4, #f72fff)",
};

const AVATAR_DECO_CLASS: Record<AvatarDecoration, string> = {
  none: "",
  "ring-gold": "ring-2 ring-[#faa61a] ring-offset-2 ring-offset-[#1e1f22]",
  "ring-blue": "ring-2 ring-[#5865f2] ring-offset-2 ring-offset-[#1e1f22]",
  "ring-red": "ring-2 ring-[#ed4245] ring-offset-2 ring-offset-[#1e1f22]",
  "ring-green": "ring-2 ring-[#23a559] ring-offset-2 ring-offset-[#1e1f22]",
  "ring-rainbow": "ring-2 ring-offset-2 ring-offset-[#1e1f22] animate-rainbow-ring",
  sparkle: "ring-2 ring-[#feca57] ring-offset-2 ring-offset-[#1e1f22] animate-pulse",
  flame: "ring-2 ring-[#ff6b6b] ring-offset-2 ring-offset-[#1e1f22] shadow-[0_0_12px_#ff6b6b]",
};

interface UserProfilePopoverProps {
  user: User;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  position?: "top" | "bottom" | "left" | "right";
}

export function UserProfilePopover({ user, anchorRef, onClose, position = "right" }: UserProfilePopoverProps) {
  const presence = useAppStore((s) => s.presence);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const getOrCreateDM = useAppStore((s) => s.getOrCreateDM);
  const setSelectedDM = useAppStore((s) => s.setSelectedDM);
  const setSelectedServer = useAppStore((s) => s.setSelectedServer);
  const users = useAppStore((s) => s.users);
  const currentUser = currentUserId ? users[currentUserId] : null;
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [editingNick, setEditingNick] = useState(false);
  const [nickValue, setNickValue] = useState("");
  const [currentNick, setCurrentNick] = useState<string | null>(null);

  const status = presence[user.id]?.status ?? user.presence ?? "offline";
  const customStatus = presence[user.id]?.customStatus ?? user.customStatus;
  const isOwn = user.id === currentUserId;
  const theme = user.profileTheme ?? "default";
  const bannerGradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS.default;
  const nameplateStyle = user.nameplate ?? "default";

  useEffect(() => {
    setCurrentNick(getCustomNickname(user.id));
  }, [user.id]);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    let top = r.top;
    let left = r.left;
    if (position === "left") {
      left = r.left - 288 - gap;
    } else if (position === "right") {
      left = r.right + gap;
    } else if (position === "bottom") {
      top = r.bottom + gap;
      left = r.left + r.width / 2 - 144;
    } else {
      top = r.top - gap;
      left = r.left + r.width / 2 - 144;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - 460));
    left = Math.max(8, Math.min(left, window.innerWidth - 296));
    setCoords({ top, left });
  }, [anchorRef, position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, anchorRef]);

  const handleDM = useCallback(() => {
    if (!currentUserId || isOwn) return;
    const dmId = getOrCreateDM(user.id, currentUserId);
    setSelectedServer(null);
    setSelectedDM(dmId);
    onClose();
  }, [currentUserId, user.id, isOwn, getOrCreateDM, setSelectedServer, setSelectedDM, onClose]);

  const isFriend = currentUser?.friends?.includes(user.id) ?? false;
  const hasPendingRequest = currentUser?.friendRequests?.some((r) => r.fromUserId === user.id) ?? false;
  const sentRequest = user.friendRequests?.some((r) => r.fromUserId === currentUserId) ?? false;

  const [requestSent, setRequestSent] = useState(false);

  const handleSendFriendRequest = useCallback(() => {
    if (!currentUserId || isOwn) return;
    const sock = getSocket();
    if (sock) {
      sock.emit("friend:request", { fromUserId: currentUserId, toUserId: user.id }, (res: any) => {
        if (res?.ok) {
          setRequestSent(true);
          pushNotification({
            type: "info",
            title: "Friend Request Sent",
            body: `Your friend request to ${user.username} was sent!`,
            icon: user.avatar,
          });
        } else {
          pushNotification({
            type: "info",
            title: "Could not send request",
            body: res?.error ?? "Something went wrong",
          });
        }
      });
    }
  }, [currentUserId, user.id, user.username, user.avatar, isOwn]);

  const handleAcceptRequest = useCallback(() => {
    if (!currentUserId) return;
    const sock = getSocket();
    if (sock) {
      sock.emit("friend:accept", { userId: currentUserId, fromUserId: user.id }, () => {});
    }
  }, [currentUserId, user.id]);

  const handleDeclineRequest = useCallback(() => {
    if (!currentUserId) return;
    const sock = getSocket();
    if (sock) {
      sock.emit("friend:decline", { userId: currentUserId, fromUserId: user.id }, () => {});
    }
  }, [currentUserId, user.id]);

  const handleUnfriend = useCallback(() => {
    if (!currentUserId || isOwn) return;
    const sock = getSocket();
    if (sock) {
      sock.emit("friend:remove", { userId: currentUserId, targetId: user.id }, () => {});
    }
    onClose();
  }, [currentUserId, user.id, isOwn, onClose]);

  const saveNick = () => {
    const trimmed = nickValue.trim();
    setNicknameLocal(user.id, trimmed || null);
    setCurrentNick(trimmed || null);
    setEditingNick(false);
  };

  const nameColorStyle = (): React.CSSProperties => {
    if (nameplateStyle === "rainbow" || nameplateStyle === "gradient") return {};
    return { color: user.nameColor || "#ffffff" };
  };

  const nameClassName = cn(
    "mt-2 font-bold text-lg leading-tight",
    nameplateStyle === "glow" && "drop-shadow-[0_0_8px_currentColor]",
    nameplateStyle === "outlined" && "[text-shadow:_-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]",
    nameplateStyle === "rainbow" && "animate-rainbow-text bg-clip-text text-transparent bg-[length:200%_auto] bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500",
    nameplateStyle === "gradient" && "bg-clip-text text-transparent bg-gradient-to-r from-[#5865f2] to-[#eb459e]",
  );

  const content = (
    <div
      ref={popoverRef}
      className="fixed z-[100] w-72 rounded-xl bg-[#1e1f22] border border-[#3f4147] shadow-2xl overflow-hidden"
      style={{ top: coords.top, left: coords.left }}
    >
      {/* Banner: use user banner or profile theme gradient */}
      {user.banner ? (
        <div className="h-24 overflow-hidden">
          <img src={user.banner} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-24" style={{ background: bannerGradient }} />
      )}

      <div className="px-4 pb-4 -mt-10">
        <div className="relative w-20 h-20">
          <div className={cn(
            "w-20 h-20 rounded-full border-4 border-[#1e1f22] bg-[#2b2d31] overflow-hidden flex items-center justify-center text-white text-2xl font-bold shadow-md",
            AVATAR_DECO_CLASS[user.avatarDecoration ?? "none"]
          )}>
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user.username.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className={cn(
            "absolute bottom-0 right-0 w-5 h-5 rounded-full border-[3px] border-[#1e1f22]",
            status === "online" && "bg-[#23a559]",
            status === "idle" && "bg-[#faa61a]",
            status === "dnd" && "bg-[#f23f42]",
            status === "offline" && "bg-[#80848e]"
          )} />
        </div>

        <h3 className={nameClassName} style={nameColorStyle()}>
          {currentNick || user.username}
          {isOwn && <span className="text-sm font-normal text-[#949ba4] ml-1">(you)</span>}
        </h3>
        {currentNick && (
          <p className="text-xs text-[#949ba4]">{user.username}#{user.discriminator}</p>
        )}
        {!currentNick && (
          <p className="text-xs text-[#949ba4]">#{user.discriminator}</p>
        )}
        {user.pronouns && (
          <p className="text-xs text-[#949ba4] mt-0.5">{user.pronouns}</p>
        )}
        {customStatus && (
          <p className="mt-1 text-sm text-[#949ba4] italic">&ldquo;{customStatus}&rdquo;</p>
        )}
        {user.badges && user.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {user.badges.map((b, i) => {
              const isDev = b === "🛠️ Developer" || b === "👑 Site Owner";
              return (
                <span key={i} className={cn(
                  "px-2 py-0.5 rounded-md text-xs text-[#dbdee1]",
                  isDev ? "bg-[#faa61a]/20 border border-[#faa61a]/30" : "bg-[#5865f2]/15 border border-[#5865f2]/25"
                )}>
                  {b}
                </span>
              );
            })}
          </div>
        )}
        {user.widget && (
          <p className="mt-2 text-xs text-[#949ba4] bg-[#2b2d31] p-2 rounded-lg border border-[#3f4147]">{user.widget}</p>
        )}
        {user.bio && (
          <div className="mt-3 pt-3 border-t border-[#3f4147]">
            <p className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider mb-1">About Me</p>
            <p className="text-sm text-[#dbdee1] leading-relaxed whitespace-pre-wrap">{user.bio}</p>
          </div>
        )}

        {!isOwn && (
          <div className="mt-3 pt-3 border-t border-[#3f4147] space-y-1.5">
            {editingNick ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nickValue}
                  onChange={(e) => setNickValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNick(); if (e.key === "Escape") setEditingNick(false); }}
                  placeholder="Set a nickname..."
                  maxLength={32}
                  className="flex-1 px-2 py-1 rounded bg-[#2b2d31] border border-[#3f4147] text-white text-xs focus:border-[#5865f2] focus:outline-none"
                  autoFocus
                />
                <button onClick={saveNick} className="p-1 rounded bg-[#23a559] text-white hover:bg-[#1a8f4a]">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingNick(false)} className="p-1 rounded bg-[#3f4147] text-[#949ba4] hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNickValue(currentNick || ""); setEditingNick(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#dbdee1] hover:bg-[#3f4147] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-[#949ba4]" />
                {currentNick ? "Edit Nickname" : "Set Nickname"}
              </button>
            )}
            <button
              onClick={handleDM}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#dbdee1] hover:bg-[#3f4147] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#949ba4]" />
              Send Message
            </button>
            {hasPendingRequest ? (
              <div className="flex gap-1.5">
                <button
                  onClick={handleAcceptRequest}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white bg-[#23a559] hover:bg-[#1a8f4a] transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept
                </button>
                <button
                  onClick={handleDeclineRequest}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#f23f42] hover:bg-[#f23f42]/10 transition-colors border border-[#3f4147]"
                >
                  <X className="w-3.5 h-3.5" />
                  Decline
                </button>
              </div>
            ) : isFriend ? (
              <button
                onClick={handleUnfriend}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#f23f42] hover:bg-[#f23f42]/10 transition-colors"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Remove Friend
              </button>
            ) : sentRequest || requestSent ? (
              <button
                disabled
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#949ba4] cursor-default"
              >
                <Check className="w-3.5 h-3.5" />
                Request Sent
              </button>
            ) : (
              <button
                onClick={handleSendFriendRequest}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#23a559] hover:bg-[#23a559]/10 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Send Friend Request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
