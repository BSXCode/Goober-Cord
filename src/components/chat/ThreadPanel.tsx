"use client";

import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { MessageItem } from "./MessageItem";
import { Composer } from "./Composer";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ThreadPanelProps {
  rootMessageId: string;
  channelId: string;
}

export function ThreadPanel({ rootMessageId, channelId }: ThreadPanelProps) {
  const messages = useAppStore((s) => s.messages);
  const threads = useAppStore((s) => s.threads);
  const setThreadPanel = useAppStore((s) => s.setThreadPanel);
  const rootMessage = messages[rootMessageId];
  const thread = rootMessage?.threadId ? threads[rootMessage.threadId] : null;
  const threadMessages = thread
    ? thread.messageIds.map((id) => messages[id]).filter(Boolean)
    : [];

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-l border-[#3f4147] bg-[#313338]">
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#3f4147]">
        <span className="text-sm font-semibold text-[#f2f3f5]">Thread</span>
        <button
          onClick={() => setThreadPanel(null)}
          className="p-1 rounded text-[#b5bac1] hover:text-white hover:bg-[#3f4147]"
          aria-label="Close thread"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin p-2">
        {rootMessage && <MessageItem message={rootMessage} />}
        {threadMessages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
      </div>
      {thread && (
        <Composer
          channelId={channelId}
          threadId={thread.id}
        />
      )}
    </div>
  );
}
