"use client";

import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff } from "lucide-react";

export function VoiceBar() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const voiceStates = useAppStore((s) => s.voiceStates);
  const channels = useAppStore((s) => s.channels);
  const setVoiceState = useAppStore((s) => s.setVoiceState);
  const vs = currentUserId ? voiceStates[currentUserId] : null;

  const inVoice = vs?.channelId ?? null;
  const channel = inVoice ? channels[inVoice] : null;
  const muted = vs?.muted ?? false;
  const deafened = vs?.deafened ?? false;

  if (!currentUserId || !inVoice) return null;

  const leaveVoice = () => setVoiceState(currentUserId, null, false, false, false);
  const toggleMute = () => setVoiceState(currentUserId, inVoice, !muted, deafened, false);
  const toggleDeafen = () => setVoiceState(currentUserId, inVoice, muted, !deafened, false);

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 mx-2 mb-1 rounded-xl bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full bg-[#23a559] animate-pulse" />
        <span className="text-sm text-[#b5bac1] truncate">
          {channel && "name" in channel ? channel.name : "Voice"}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={toggleMute}
          className={cn(
            "p-2 rounded transition-colors",
            muted ? "bg-[#f23f42] text-white" : "text-[#b5bac1] hover:bg-[#3f4147] hover:text-white"
          )}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={toggleDeafen}
          className={cn(
            "p-2 rounded transition-colors",
            deafened ? "bg-[#f23f42] text-white" : "text-[#b5bac1] hover:bg-[#3f4147] hover:text-white"
          )}
          title={deafened ? "Undeafen" : "Deafen"}
        >
          {deafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={leaveVoice}
          className="p-2 rounded text-[#f23f42] hover:bg-[#f23f42] hover:text-white transition-colors"
          title="Leave"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
