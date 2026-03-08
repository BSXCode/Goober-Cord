"use client";

import { useState, useRef, useCallback, useEffect, useMemo, Suspense, lazy } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { Plus, Smile, ImageIcon, X, Reply, Volume2, Play, Gamepad2 } from "lucide-react";
import type { MessageAttachment, SoundboardSound } from "@/lib/types";

const GifPicker = lazy(() => import("./GifPicker").then((m) => ({ default: m.GifPicker })));
const EmojiPicker = lazy(() => import("./EmojiPicker").then((m) => ({ default: m.EmojiPicker })));
const GamesPanel = lazy(() => import("../games/GamesPanel").then((m) => ({ default: m.GamesPanel })));
import { getSocket } from "@/lib/socket";

interface ComposerProps {
  channelId: string;
  threadId?: string;
  replyToId?: string | null;
  onCancelReply?: () => void;
}

export function Composer({ channelId, threadId, replyToId, onCancelReply }: ComposerProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const channels = useAppStore((s) => s.channels);
  const servers = useAppStore((s) => s.servers);
  const selectedServerId = useAppStore((s) => s.selectedServerId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const messages = useAppStore((s) => s.messages);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const sendThreadReply = useAppStore((s) => s.sendThreadReply);
  const setTyping = useAppStore((s) => s.setTyping);

  const usernameIndex = useMemo(() => {
    const idx = new Map<string, string>();
    for (const [id, user] of Object.entries(users)) {
      idx.set(user.username.toLowerCase(), id);
    }
    return idx;
  }, [users]);

  const resolveMentions = useCallback(
    (text: string) => {
      // Handle quoted mentions: @"Name With Spaces"
      let result = text.replace(/(^|[\s([{"'`])@"([^"]{1,32})"/g, (_full, prefix: string, name: string) => {
        const targetId = usernameIndex.get(name.toLowerCase());
        if (!targetId) return _full;
        return `${prefix}<@${targetId}>`;
      });

      // Handle unquoted mentions — greedily match multi-word usernames
      result = result.replace(/(^|[\s([{"'`])@(\S.{0,31})/g, (_full, prefix: string, rest: string) => {
        const words = rest.split(/\s+/);
        // Try longest match first (up to 6 words)
        for (let len = Math.min(words.length, 6); len >= 1; len--) {
          const candidate = words.slice(0, len).join(" ");
          const targetId = usernameIndex.get(candidate.toLowerCase());
          if (targetId) {
            const remainder = rest.slice(candidate.length);
            return `${prefix}<@${targetId}>${remainder}`;
          }
        }
        return _full;
      });

      return result;
    },
    [usernameIndex]
  );

  const clearTypingTimer = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const scheduleTypingStop = useCallback(() => {
    if (!currentUserId) return;
    clearTypingTimer();
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(channelId, currentUserId, false);
      typingTimeoutRef.current = null;
    }, 2500);
  }, [channelId, currentUserId, setTyping, clearTypingTimer]);

  useEffect(() => {
    return () => {
      clearTypingTimer();
      if (currentUserId) {
        setTyping(channelId, currentUserId, false);
      }
    };
  }, [channelId, currentUserId, setTyping, clearTypingTimer]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!currentUserId) return;
      const hasContent = trimmed || attachments.length > 0;
      if (!hasContent) return;
      const text = resolveMentions(trimmed);
      if (threadId) {
        sendThreadReply(currentUserId, channelId, threadId, text, attachments.length ? attachments : undefined);
      } else {
        sendMessage(currentUserId, channelId, text, { replyToId: replyToId ?? undefined, attachments: attachments.length ? attachments : undefined });
      }
      onCancelReply?.();
      setContent("");
      setAttachments([]);
      setMentionQuery(null);
      clearTypingTimer();
      setTyping(channelId, currentUserId, false);
    },
    [content, currentUserId, channelId, threadId, sendMessage, sendThreadReply, attachments, setTyping, resolveMentions, clearTypingTimer]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        const user = mentionSuggestions[mentionIdx];
        if (user) insertMention(user.username, user.id);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      return;
    }
    const hasTypingContent = e.currentTarget.value.trim().length > 0 || attachments.length > 0;
    if (currentUserId && hasTypingContent) {
      setTyping(channelId, currentUserId, true);
      scheduleTypingStop();
    } else if (currentUserId) {
      setTyping(channelId, currentUserId, false);
      clearTypingTimer();
    }
  };

  const handleGifSelect = useCallback((gif: { id: string; url: string }) => {
    setAttachments((prev) => [
      ...prev,
      {
        id: `gif-${gif.id}`,
        name: "gif.gif",
        url: gif.url,
        size: 0,
        contentType: "image/gif",
      },
    ]);
    setShowGifPicker(false);
  }, []);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    list.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" is too large. Max 25MB per file.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2),
            name: file.name,
            url: reader.result as string,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    addFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.files?.length) return;
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  };

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return Object.values(users)
      .filter((u) => u.username.toLowerCase().includes(q) && u.id !== currentUserId)
      .slice(0, 8);
  }, [mentionQuery, users, currentUserId]);

  const detectMentionQuery = useCallback((text: string, cursorPos: number) => {
    const before = text.slice(0, cursorPos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx === -1) { setMentionQuery(null); return; }
    if (atIdx > 0 && !/[\s([{"'`]/.test(before[atIdx - 1])) { setMentionQuery(null); return; }
    const query = before.slice(atIdx + 1);
    if (query.includes("\n")) { setMentionQuery(null); return; }
    setMentionQuery(query);
    setMentionIdx(0);
  }, []);

  const insertMention = useCallback((username: string, userId: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = content.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx === -1) return;
    const after = content.slice(pos);
    const newContent = before.slice(0, atIdx) + `<@${userId}> ` + after;
    setContent(newContent);
    setMentionQuery(null);
    setTimeout(() => {
      const newPos = atIdx + userId.length + 4;
      ta.selectionStart = ta.selectionEnd = newPos;
      ta.focus();
    }, 0);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setContent(next);
    detectMentionQuery(next, e.target.selectionStart);
    if (!currentUserId) return;
    const isTypingNow = next.trim().length > 0 || attachments.length > 0;
    setTyping(channelId, currentUserId, isTypingNow);
    if (isTypingNow) scheduleTypingStop();
    else clearTypingTimer();
  };

  return (
    <div
      className="flex-shrink-0 bg-transparent p-4 pb-6"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {replyToId && (() => {
        const replyMsg = messages[replyToId];
        const replyAuthor = replyMsg ? users[replyMsg.authorId] : null;
        return (
          <div className="flex items-center gap-2 px-4 py-1.5 mb-1 rounded-t-xl bg-[#2e3035] border border-b-0 border-[var(--glass-border)] text-xs text-[#b5bac1]">
            <Reply className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Replying to <strong className="text-white">{replyAuthor?.username ?? "Unknown"}</strong></span>
            <span className="truncate max-w-xs opacity-60">{replyMsg?.content.slice(0, 60)}</span>
            <button onClick={onCancelReply} className="ml-auto p-0.5 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        );
      })()}
      <form
        action="#"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSubmit(e);
          return false;
        }}
        className="flex flex-col gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleFileChange}
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att) => (
              <div key={att.id} className="relative inline-block">
                {att.contentType.startsWith("image/") ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-20 rounded-lg object-cover shadow-sm border border-[var(--glass-border)]"
                  />
                ) : att.contentType.startsWith("video/") ? (
                  <video src={att.url} className="max-h-20 rounded-lg object-cover shadow-sm border border-[var(--glass-border)]" muted />
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">{att.name}</span>
                )}
                <button
                  type="button"
                  onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] px-4 py-3 shadow-lg focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/50 transition-all relative">
          {mentionQuery !== null && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-64 bg-[#2b2d31] rounded-lg border border-[#3f4147] shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-[#b5bac1] uppercase tracking-wide">Members</div>
              {mentionSuggestions.map((u, i) => (
                <button
                  key={u.id}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(u.username, u.id); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm",
                    i === mentionIdx ? "bg-[var(--accent)] text-white" : "text-[#dbdee1] hover:bg-[#3f4147]"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-[#5865f2] flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-xs font-medium">
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.username[0].toUpperCase()}
                  </div>
                  <span className="truncate">{u.username}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded hover:bg-[var(--channel-hover)]"
            aria-label="Attach file"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              ref={gifButtonRef}
              type="button"
              onClick={() => { setShowGifPicker((v) => !v); setShowEmojiPicker(false); }}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded hover:bg-[var(--channel-hover)]"
              aria-label="GIF"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <Suspense fallback={null}>
              {showGifPicker && (
                <GifPicker
                  onSelect={handleGifSelect}
                  onClose={() => setShowGifPicker(false)}
                  anchorRef={gifButtonRef}
                />
              )}
            </Suspense>
          </div>
          <button
            type="button"
            onClick={() => { setShowGames(true); setShowGifPicker(false); setShowEmojiPicker(false); setShowSoundboard(false); }}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded hover:bg-[var(--channel-hover)]"
            aria-label="Games"
          >
            <Gamepad2 className="w-5 h-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              if (!currentUserId) return;
              clearTypingTimer();
              setTyping(channelId, currentUserId, false);
            }}
            placeholder={threadId ? "Reply in thread" : "Message #channel"}
            rows={1}
            className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-muted)] resize-none min-h-[24px] max-h-[200px] py-2 focus:outline-none"
          />
          {selectedServerId && (() => {
            const srv = servers[selectedServerId];
            const sounds: SoundboardSound[] = srv?.soundboard ?? [];
            if (sounds.length === 0) return null;
            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowSoundboard((v) => !v); setShowGifPicker(false); setShowEmojiPicker(false); }}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded hover:bg-[var(--channel-hover)]"
                  aria-label="Soundboard"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                {showSoundboard && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 max-h-72 bg-[#2b2d31] rounded-xl border border-[#3f4147] shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#3f4147] text-xs font-semibold text-[#b5bac1] uppercase">Soundboard</div>
                    <div className="overflow-y-auto max-h-60 p-1">
                      {sounds.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            const audio = new Audio(s.url);
                            audio.volume = 0.5;
                            audio.play().catch(() => {});
                            const sock = getSocket();
                            if (sock) sock.emit("soundboard:play", { serverId: selectedServerId, soundId: s.id });
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#3f4147] text-left"
                        >
                          <Play className="w-3.5 h-3.5 text-[#5865f2] flex-shrink-0" />
                          <span className="text-sm text-[#dbdee1] truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="relative">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => { setShowEmojiPicker((v) => !v); setShowGifPicker(false); setShowSoundboard(false); }}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded hover:bg-[var(--channel-hover)]"
              aria-label="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <Suspense fallback={null}>
              {showEmojiPicker && (
                <EmojiPicker
                  anchorRef={emojiButtonRef}
                  onClose={() => setShowEmojiPicker(false)}
                  onSelectEmoji={(emoji) => {
                    setContent((prev) => prev + emoji);
                    textareaRef.current?.focus();
                  }}
                  onSelectCustomEmoji={(_id, _url) => {
                    setContent((prev) => prev + `<:${_id}:>`);
                    textareaRef.current?.focus();
                  }}
                  onSelectSticker={(url, name) => {
                    setAttachments((prev) => [...prev, {
                      id: `sticker-${Math.random().toString(36).slice(2)}`,
                      name: `${name}.png`,
                      url,
                      size: 0,
                      contentType: "image/png",
                    }]);
                  }}
                />
              )}
            </Suspense>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Press Enter to send, Shift+Enter for new line.
        </p>
      </form>
      <Suspense fallback={null}>
        <GamesPanel open={showGames} onClose={() => setShowGames(false)} />
      </Suspense>
    </div>
  );
}
