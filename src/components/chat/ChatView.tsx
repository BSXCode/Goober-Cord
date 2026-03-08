"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { ChannelHeader } from "./ChannelHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { ThreadPanel } from "./ThreadPanel";
import { cn } from "@/lib/cn";

export function ChatView() {
  const selectedChannelId = useAppStore((s) => s.selectedChannelId);
  const selectedDMId = useAppStore((s) => s.selectedDMId);
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const memberListOpen = useAppStore((s) => s.memberListOpen);
  const typing = useAppStore((s) => s.typing);
  const users = useAppStore((s) => s.users);
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const channelId = selectedChannelId ?? selectedDMId;
  if (!channelId) return null;

  const typingUsers = Array.from(typing.get(channelId) ?? [])
    .map((uid) => users[uid]?.username)
    .filter(Boolean);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden p-2">
      <div className={cn("flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] shadow-[var(--shadow-cozy)] relative z-0", memberListOpen && "mr-2")}>
        <ChannelHeader channelId={channelId} isDM={!!selectedDMId} />
        <MessageList channelId={channelId} onReply={setReplyToId} />
        <div className="px-4 pb-1 min-h-[20px]">
          {typingUsers.length > 0 && (
            <div className="text-xs font-bold text-[var(--text-muted)] animate-pulse">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}
        </div>
        <Composer channelId={channelId} replyToId={replyToId} onCancelReply={() => setReplyToId(null)} />
      </div>
      {threadPanelMessageId && (
        <ThreadPanel rootMessageId={threadPanelMessageId} channelId={channelId} />
      )}
    </div>
  );
}
