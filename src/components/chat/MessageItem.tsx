"use client";

import { useState, useRef, memo } from "react";
import type { Message } from "@/lib/types";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { MessageContent } from "./MessageContent";
import { cn } from "@/lib/cn";
import { Smile, Reply, MoreHorizontal, Plus, Trash2, Pencil, Users, Pin } from "lucide-react";
import { UserProfilePopover } from "../layout/UserProfilePopover";

interface MessageItemProps {
  message: Message;
  onReply?: (messageId: string) => void;
}

const EMOJI_QUICK = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export const MessageItem = memo(function MessageItem({ message, onReply }: MessageItemProps) {
  const users = useAppStore((s) => s.users);
  const servers = useAppStore((s) => s.servers);
  const channels = useAppStore((s) => s.channels);
  const threads = useAppStore((s) => s.threads);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const members = useAppStore((s) => s.members);
  const addReaction = useAppStore((s) => s.addReaction);
  const removeReaction = useAppStore((s) => s.removeReaction);
  const setThreadPanel = useAppStore((s) => s.setThreadPanel);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const editMessage = useAppStore((s) => s.editMessage);
  const togglePin = useAppStore((s) => s.togglePin);
  const joinServer = useAppStore((s) => s.joinServer);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const profileAnchorRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const messages = useAppStore((s) => s.messages);
  const author = users[message.authorId];
  const authorName = author?.username ?? "Unknown";
  const thread = message.threadId ? threads[message.threadId] : null;
  const replyMsg = message.replyToId ? messages[message.replyToId] : null;
  const replyAuthor = replyMsg ? users[replyMsg.authorId] : null;

  const channel = channels[message.channelId];
  const server = channel ? servers[channel.serverId] : null;
  const allEmojis = (() => {
    const emojis: import("@/lib/types").CustomEmoji[] = [];
    Object.values(servers).forEach((s) => {
      if (s.customEmojis) emojis.push(...s.customEmojis);
    });
    return emojis;
  })();

  const nameplateStyle = author?.nameplate ?? "default";

  const authorNameClassName = cn(
    "font-semibold cursor-pointer hover:underline",
    nameplateStyle === "glow" && "drop-shadow-[0_0_6px_currentColor]",
    nameplateStyle === "outlined" && "[text-shadow:_-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]",
    nameplateStyle === "rainbow" && "animate-rainbow-text bg-clip-text text-transparent bg-[length:200%_auto] bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500",
    nameplateStyle === "gradient" && "bg-clip-text text-transparent bg-gradient-to-r from-[#5865f2] to-[#eb459e]",
  );

  const authorNameStyle: React.CSSProperties =
    nameplateStyle !== "rainbow" && nameplateStyle !== "gradient"
      ? { color: author?.nameColor || "#ffffff" }
      : {};

  return (
    <div className={cn("group relative flex flex-col py-0.5 px-2 -mx-2 rounded hover:bg-[var(--surface)]/40 transition-colors animate-slide-up", message.pinned && "border-l-2 border-[#faa61a]/50 bg-[#faa61a]/5")}>
      {message.pinned && (
        <div className="flex items-center gap-1 ml-14 mb-0.5 text-[10px] text-[#faa61a]">
          <Pin className="w-3 h-3" />
          <span>Pinned</span>
        </div>
      )}
      {message.replyToId && (
        <div className="flex items-center gap-1.5 ml-14 mb-0.5 text-xs text-[#949ba4]">
          <Reply className="w-3 h-3 rotate-180" />
          {replyMsg ? (
            <>
              <span className="font-medium text-[#b5bac1]">{replyAuthor?.username ?? "Unknown"}</span>
              <span className="truncate max-w-xs opacity-70">
                {replyMsg.content.trim()
                  ? replyMsg.content.slice(0, 80)
                  : replyMsg.attachments?.length
                    ? "Attachment"
                    : ""}
              </span>
            </>
          ) : (
            <span className="italic opacity-60">Message Deleted</span>
          )}
        </div>
      )}
      <div className="flex gap-4">
      {/* Floating action bar */}
      <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-[#2b2d31] rounded-md border border-[#3f4147] shadow-lg px-0.5 py-0.5 z-20">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="p-1 hover:bg-[#3f4147] rounded text-[#b5bac1] hover:text-white"
          aria-label="Add reaction"
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          onClick={() => onReply?.(message.id)}
          className="p-1 hover:bg-[#3f4147] rounded text-[#b5bac1] hover:text-white"
          aria-label="Reply"
        >
          <Reply className="w-4 h-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="p-1 hover:bg-[#3f4147] rounded text-[#b5bac1] hover:text-white"
            aria-label="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMore && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-[#111214] rounded-md border border-[#3f4147] shadow-xl z-50 py-1" onMouseLeave={() => setShowMore(false)}>
              <button
                onClick={() => { togglePin(message.channelId, message.id); setShowMore(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white"
              >
                <Pin className="w-3.5 h-3.5" /> {message.pinned ? "Unpin" : "Pin"}
              </button>
              {message.authorId === currentUserId && (
                <button
                  onClick={() => { setIsEditing(true); setEditContent(message.content); setShowMore(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
              {message.authorId === currentUserId && (
                <button
                  onClick={() => { deleteMessage(message.channelId, message.id); setShowMore(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Emoji quick-pick dropdown */}
      {showEmoji && (
        <div
          ref={emojiRef}
          className="absolute -top-10 right-2 flex items-center gap-0.5 bg-[#2b2d31] rounded-lg border border-[#3f4147] shadow-xl px-1 py-1 z-30"
          onMouseLeave={() => setShowEmoji(false)}
        >
          {EMOJI_QUICK.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                if (currentUserId) addReaction(message.channelId, message.id, emoji, currentUserId);
                setShowEmoji(false);
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-[#3f4147] rounded text-base"
            >
              {emoji}
            </button>
          ))}
          {allEmojis.slice(0, 6).map((ce) => (
            <button
              key={ce.id}
              onClick={() => {
                if (currentUserId) addReaction(message.channelId, message.id, `custom:${ce.id}`, currentUserId);
                setShowEmoji(false);
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-[#3f4147] rounded"
              title={`:${ce.name}:`}
            >
              <img src={ce.url} alt={ce.name} className="w-5 h-5 object-contain" />
            </button>
          ))}
        </div>
      )}

      {/* Avatar - clickable */}
      <div
        ref={profileAnchorRef}
        className="w-10 h-10 rounded-full bg-[#5865f2] flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-medium mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => author && setShowProfile((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && author) { e.preventDefault(); setShowProfile((v) => !v); } }}
      >
        {author?.avatar ? (
          <img src={author.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          authorName.slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={authorNameClassName}
            style={authorNameStyle}
            onClick={() => author && setShowProfile((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && author) { e.preventDefault(); setShowProfile((v) => !v); } }}
          >
            {authorName}
          </span>
          <span className="text-xs text-[#949ba4]">
            {new Date(message.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {message.edited && " (edited)"}
          </span>
        </div>
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (editContent.trim() && currentUserId) {
                    editMessage(currentUserId, message.channelId, message.id, editContent.trim());
                  }
                  setIsEditing(false);
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="w-full px-3 py-1.5 rounded bg-[#383a40] border border-[#5865f2] text-[#dbdee1] text-sm resize-none focus:outline-none"
              rows={2}
              autoFocus
            />
            <p className="text-[10px] text-[#949ba4] mt-0.5">Enter to save, Escape to cancel</p>
          </div>
        ) : (
          message.content.trim() !== "" && (
            <div className="text-[#dbdee1] break-words">
              <MessageContent content={message.content} />
            </div>
          )
        )}
        {message.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att) =>
              att.contentType.startsWith("image/") ? (
                <img key={att.id} src={att.url} alt={att.name} className="max-w-xs max-h-64 rounded object-cover" />
              ) : att.contentType.startsWith("video/") ? (
                <video key={att.id} src={att.url} controls className="max-w-xs max-h-64 rounded" />
              ) : (
                <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline text-sm">
                  {att.name}
                </a>
              )
            )}
          </div>
        )}

        {message.embeds && message.embeds.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {message.embeds.map((embed, i) => (
              <div key={i} className="flex flex-col bg-[#2b2d31] border-l-4 border-[#5865f2] rounded p-3 max-w-md">
                {embed.site_name && <span className="text-xs text-[#b5bac1] mb-1">{embed.site_name}</span>}
                {embed.title && (
                  <a href={embed.url} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] font-semibold hover:underline mb-1">
                    {embed.title}
                  </a>
                )}
                {embed.description && <p className="text-sm text-[#dbdee1] mb-2">{embed.description}</p>}
                {embed.image && (
                  <img src={embed.image} alt="" className="rounded max-h-64 object-contain self-start" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Server invite card */}
        {message.invite && (() => {
          const inv = message.invite;
          const alreadyMember = currentUserId ? Object.values(members).some(
            (m) => m.serverId === inv.serverId && m.userId === currentUserId
          ) : false;
          const serverExists = !!servers[inv.serverId];
          return (
            <div className="mt-2 w-80 bg-[#2b2d31] rounded-xl border border-[#3f4147] overflow-hidden shadow-lg">
              <div className="h-16 bg-gradient-to-r from-[#5865f2] to-[#eb459e] overflow-hidden">
                {inv.serverBanner && (
                  <img src={inv.serverBanner} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3 flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#313338] border-2 border-[#2b2d31] overflow-hidden flex-shrink-0 -mt-8 flex items-center justify-center">
                  {inv.serverIcon ? (
                    <img src={inv.serverIcon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-lg font-bold bg-[#5865f2] w-full h-full flex items-center justify-center">
                      {inv.serverName[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-white font-semibold text-sm truncate">{inv.serverName}</p>
                  <div className="flex items-center gap-1 text-[10px] text-[#949ba4] mt-0.5">
                    <Users className="w-3 h-3" />
                    <span>{inv.memberCount} member{inv.memberCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3">
                {alreadyMember ? (
                  <button disabled className="w-full py-2 rounded-lg text-sm font-medium bg-[#3f4147] text-[#949ba4] cursor-default">
                    Already Joined
                  </button>
                ) : serverExists ? (
                  <button
                    onClick={() => currentUserId && joinServer(inv.serverId, currentUserId)}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-[#23a559] hover:bg-[#1a8f4a] text-white transition-colors"
                  >
                    Join Server
                  </button>
                ) : (
                  <button disabled className="w-full py-2 rounded-lg text-sm font-medium bg-[#3f4147] text-[#949ba4] cursor-default">
                    Server Unavailable
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Reactions display */}
        {Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              const isCustom = emoji.startsWith("custom:");
              const emojiId = isCustom ? emoji.slice(7) : null;
              const customEmoji = emojiId ? allEmojis.find((e) => e.id === emojiId) : null;

              return (
                <button
                  key={emoji}
                  onClick={() => {
                    if (!currentUserId) return;
                    if (userIds.includes(currentUserId)) {
                      removeReaction(message.channelId, message.id, emoji, currentUserId);
                    } else {
                      addReaction(message.channelId, message.id, emoji, currentUserId);
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-sm border transition-colors",
                    userIds.includes(currentUserId ?? "")
                      ? "bg-[#5865f2]/20 border-[#5865f2]/50 text-[#dfe0e2]"
                      : "bg-[#2e3035] border-transparent text-[#b5bac1] hover:border-[#3f4147]"
                  )}
                >
                  {isCustom && customEmoji ? (
                    <img src={customEmoji.url} alt={customEmoji.name} className="w-4 h-4 object-contain" />
                  ) : (
                    <span>{emoji}</span>
                  )}
                  {userIds.length > 0 && <span className="text-xs">{userIds.length}</span>}
                </button>
              );
            })}
            <button
              onClick={() => setShowEmoji(true)}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-sm border border-transparent bg-[#2e3035] text-[#b5bac1] hover:border-[#3f4147]"
              aria-label="Add reaction"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {thread && (
          <button
            onClick={() => setThreadPanel(message.id)}
            className="mt-2 flex items-center gap-1 text-sm text-[#b5bac1] hover:text-[#00a8fc]"
          >
            <Reply className="w-4 h-4" />
            {thread.messageIds.length} {thread.messageIds.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
      </div>

      {/* Profile popover */}
      {showProfile && author && (
        <UserProfilePopover
          user={author}
          anchorRef={profileAnchorRef}
          onClose={() => setShowProfile(false)}
          position="left"
        />
      )}
    </div>
  );
});
