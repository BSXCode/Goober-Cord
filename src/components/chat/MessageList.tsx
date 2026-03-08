"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { MessageItem } from "./MessageItem";
import { ArrowDown } from "lucide-react";

interface MessageListProps {
  channelId: string;
  onReply?: (messageId: string) => void;
}

const RENDER_BUFFER = 60;
const LOAD_MORE_THRESHOLD = 40;

export function MessageList({ channelId, onReply }: MessageListProps) {
  const messages = useAppStore((s) => s.messages);
  const readStates = useAppStore((s) => s.readStates);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const ackRead = useAppStore((s) => s.ackRead);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSwitched = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [renderCount, setRenderCount] = useState(RENDER_BUFFER);

  const channelMessages = useMemo(
    () =>
      Object.values(messages)
        .filter((m) => m.channelId === channelId && !m.threadId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [messages, channelId]
  );

  const visibleMessages = useMemo(() => {
    if (channelMessages.length <= renderCount) return channelMessages;
    return channelMessages.slice(channelMessages.length - renderCount);
  }, [channelMessages, renderCount]);

  const hasMore = channelMessages.length > renderCount;

  useEffect(() => {
    setRenderCount(RENDER_BUFFER);
    justSwitched.current = true;
  }, [channelId]);

  useEffect(() => {
    if (!currentUserId) return;
    const last = channelMessages[channelMessages.length - 1];
    ackRead(channelId, currentUserId, last?.id ?? null);
  }, [channelId, currentUserId, channelMessages.length, ackRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
    return () => clearTimeout(timer);
  }, [channelId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (justSwitched.current) {
      justSwitched.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [channelMessages.length]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShowScrollButton(!isNearBottom);

    if (container.scrollTop < 200 && hasMore) {
      setRenderCount((prev) => Math.min(prev + LOAD_MORE_THRESHOLD, channelMessages.length));
    }
  }, [hasMore, channelMessages.length]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const { lastReadIndex } = useMemo(() => {
    const readKey = `${channelId}-${currentUserId}`;
    const lastReadId = readStates[readKey]?.lastMessageId;
    return {
      lastReadIndex: lastReadId ? visibleMessages.findIndex((m) => m.id === lastReadId) : -1,
    };
  }, [channelId, currentUserId, readStates, visibleMessages]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto scroll-thin px-4 py-4 relative"
    >
      <div className="max-w-3xl mx-auto space-y-1">
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={() => setRenderCount((p) => Math.min(p + LOAD_MORE_THRESHOLD, channelMessages.length))}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Load older messages ({channelMessages.length - renderCount} more)
            </button>
          </div>
        )}
        {visibleMessages.length === 0 && (
          <div className="py-8 text-center text-[#b5bac1]">
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Be the first to send a message!</p>
          </div>
        )}
        {visibleMessages.map((msg, i) => (
          <div key={msg.id}>
            {lastReadIndex >= 0 && i === lastReadIndex + 1 && (
              <div className="flex items-center gap-2 my-4">
                <div className="h-px flex-1 bg-[#f23f42]" />
                <span className="text-xs font-medium text-[#f23f42]">New messages</span>
                <div className="h-px flex-1 bg-[#f23f42]" />
              </div>
            )}
            <MessageItem message={msg} onReply={onReply} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 bg-[#313338] text-white px-4 py-2 rounded-full shadow-lg border border-[#2b2d31] flex items-center gap-2 hover:bg-[#3f4147] transition-colors z-50"
        >
          <span className="text-xs font-bold">Return to newest message</span>
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
