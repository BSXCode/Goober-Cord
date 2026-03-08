"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { WebRTCManager } from "@/lib/webrtc";
import type { ConnectionDiag } from "@/lib/webrtc";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/cn";
import {
  Mic, MicOff, Headphones, HeadphoneOff, Monitor,
  PhoneOff, Video, VideoOff, Minimize2, Maximize2,
  GripHorizontal, Settings, RefreshCw
} from "lucide-react";

/* ── Speaking detection hook ──────────────────────────────────── */

function useSpeakingMap(
  localStream: MediaStream | null,
  localUserId: string | null,
  remoteStreams: Map<string, MediaStream>,
  muted: boolean
) {
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const ctxRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    const activeIds = new Set<string>();

    const attach = (id: string, stream: MediaStream) => {
      if (analysersRef.current.has(id)) return;
      try {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analysersRef.current.set(id, { analyser, source });
      } catch {}
    };

    if (localStream && localUserId && !muted) {
      attach(localUserId, localStream);
      activeIds.add(localUserId);
    }

    remoteStreams.forEach((stream, uid) => {
      attach(uid, stream);
      activeIds.add(uid);
    });

    // Clean up analysers for streams that no longer exist
    analysersRef.current.forEach((val, id) => {
      if (!activeIds.has(id)) {
        val.source.disconnect();
        analysersRef.current.delete(id);
      }
    });

    // If local is muted, remove their analyser
    if (muted && localUserId && analysersRef.current.has(localUserId)) {
      analysersRef.current.get(localUserId)!.source.disconnect();
      analysersRef.current.delete(localUserId);
    }

    const buffer = new Uint8Array(128);
    const THRESHOLD = 25;

    const tick = () => {
      const next = new Set<string>();
      analysersRef.current.forEach(({ analyser }, id) => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        if (avg > THRESHOLD) next.add(id);
      });
      setSpeaking((prev) => {
        if (prev.size !== next.size) return next;
        let changed = false;
        next.forEach((id) => { if (!prev.has(id)) changed = true; });
        return changed ? next : prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [localStream, localUserId, remoteStreams, muted]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      analysersRef.current.forEach((v) => v.source.disconnect());
      analysersRef.current.clear();
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);

  return speaking;
}

/* ── Mic level meter hook (for mic test) ─────────────────────── */

function useMicLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) { setLevel(0); return; }

    const activeTracks = stream.getAudioTracks().filter((t) => t.readyState === "live");
    if (activeTracks.length === 0) { setLevel(0); return; }

    let ctx: AudioContext;
    let source: MediaStreamAudioSourceNode;
    try {
      ctx = new AudioContext();
      ctxRef.current = ctx;
      source = ctx.createMediaStreamSource(stream);
    } catch {
      setLevel(0);
      return;
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    const buffer = new Uint8Array(128);

    const tick = () => {
      try {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        setLevel(Math.min(100, (sum / buffer.length / 128) * 100));
      } catch {
        setLevel(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      try { source.disconnect(); } catch {}
      ctx.close().catch(() => {});
    };
  }, [stream]);

  return level;
}

/* ── Main widget ─────────────────────────────────────────────── */

export function VoiceWidget() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const voiceStates = useAppStore((s) => s.voiceStates);
  const channels = useAppStore((s) => s.channels);
  const servers = useAppStore((s) => s.servers);
  const users = useAppStore((s) => s.users);
  const setVoiceState = useAppStore((s) => s.setVoiceState);

  const vs = currentUserId ? voiceStates[currentUserId] : null;
  const inVoice = vs?.channelId ?? null;
  const channel = inVoice ? channels[inVoice] : null;
  const server = channel && "serverId" in channel ? servers[channel.serverId] : null;
  const muted = vs?.muted ?? false;
  const deafened = vs?.deafened ?? false;

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [micTestLoopback, setMicTestLoopback] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const managerRef = useRef<WebRTCManager | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connDiags, setConnDiags] = useState<Map<string, ConnectionDiag>>(new Map());
  const channelRef = useRef<string | null>(null);
  const signalBufferRef = useRef<Array<{ userId: string; signal: any }>>([]);

  const speaking = useSpeakingMap(mediaStream, currentUserId, remoteStreams, muted);
  const micLevel = useMicLevel(showSettings ? mediaStream : null);

  // Mic test loopback
  const loopbackRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (micTestLoopback && mediaStream) {
      const audio = new Audio();
      audio.srcObject = mediaStream;
      audio.play().catch(() => {});
      loopbackRef.current = audio;
      return () => {
        audio.pause();
        audio.srcObject = null;
        loopbackRef.current = null;
      };
    } else if (loopbackRef.current) {
      loopbackRef.current.pause();
      loopbackRef.current.srcObject = null;
      loopbackRef.current = null;
    }
  }, [micTestLoopback, mediaStream]);

  // Step 1: Register signal listener IMMEDIATELY when joining voice
  // This prevents signals from being lost while getUserMedia is pending
  useEffect(() => {
    if (!inVoice || !currentUserId) {
      signalBufferRef.current = [];
      return;
    }

    const sock = getSocket();
    if (!sock) return;

    const handleSignal = ({ userId, signal }: any) => {
      if (managerRef.current) {
        managerRef.current.handleSignal(userId, signal);
      } else {
        signalBufferRef.current.push({ userId, signal });
      }
    };
    sock.on("webrtc:signal", handleSignal);

    return () => {
      sock.off("webrtc:signal", handleSignal);
    };
  }, [inVoice, currentUserId]);

  // Step 2: When joining a voice channel, acquire audio
  useEffect(() => {
    if (!inVoice || !currentUserId) {
      if (managerRef.current) {
        managerRef.current.leave();
        managerRef.current = null;
      }
      setRemoteStreams(new Map());
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      }
      setStreamReady(false);
      setCameraEnabled(false);
      setScreenEnabled(false);
      setShowSettings(false);
      setMicTestLoopback(false);
      channelRef.current = null;
      return;
    }

    if (channelRef.current === inVoice) return;
    channelRef.current = inVoice;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
        setMediaStream(stream);
        setStreamReady(true);
      })
      .catch((e) => {
        console.error("[Voice] Failed to get mic:", e);
        setStreamReady(true);
      });
  }, [inVoice, currentUserId]);

  // Step 3: Once stream is ready, create the WebRTC manager and flush buffered signals
  useEffect(() => {
    if (!inVoice || !currentUserId || !streamReady) return;

    const manager = new WebRTCManager(
      (userId, stream) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(userId, stream);
          return next;
        });
      },
      (userId) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      },
      (diags) => setConnDiags(diags)
    );
    manager.setCurrentUser(currentUserId);
    if (mediaStream) {
      manager.setLocalStream(mediaStream);
    }
    managerRef.current = manager;

    // Flush any signals that arrived while we were setting up
    const buffered = signalBufferRef.current.splice(0);
    buffered.forEach(({ userId, signal }) => {
      console.log("[Voice] Processing buffered signal from", userId);
      manager.handleSignal(userId, signal);
    });

    // Connect to existing peers already in channel
    const existingPeers = Object.values(voiceStates).filter(
      (v) => v.channelId === inVoice && v.userId !== currentUserId
    );
    existingPeers.forEach((v) => manager.connectToPeer(v.userId));

    return () => {
      manager.leave();
      managerRef.current = null;
      setRemoteStreams(new Map());
    };
  }, [inVoice, currentUserId, streamReady]);

  // Step 4: When new users join voice channel, connect to them
  useEffect(() => {
    if (!inVoice || !currentUserId || !managerRef.current) return;
    const manager = managerRef.current;
    const channelUsers = Object.values(voiceStates).filter(
      (v) => v.channelId === inVoice && v.userId !== currentUserId
    );
    channelUsers.forEach((v) => manager.connectToPeer(v.userId));
  }, [voiceStates, inVoice, currentUserId]);

  // Step 5: Retry mechanism — if peers are still "connecting" after 5s, re-initiate
  useEffect(() => {
    if (!inVoice || !currentUserId || !managerRef.current) return;
    const manager = managerRef.current;

    const retryTimer = setInterval(() => {
      const channelUsers = Object.values(voiceStates).filter(
        (v) => v.channelId === inVoice && v.userId !== currentUserId
      );
      const connectedIds = new Set<string>();
      remoteStreams.forEach((_, uid) => connectedIds.add(uid));

      channelUsers.forEach((v) => {
        if (!connectedIds.has(v.userId)) {
          console.log("[Voice] Retry connecting to", v.userId);
          manager.retryPeer(v.userId);
        }
      });
    }, 6000);

    return () => clearInterval(retryTimer);
  }, [inVoice, currentUserId, voiceStates, remoteStreams]);

  useEffect(() => {
    if (managerRef.current && mediaStream) {
      managerRef.current.setLocalStream(mediaStream);
    }
  }, [mediaStream]);

  useEffect(() => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    }
  }, [muted, mediaStream]);

  const updateStream = useCallback(
    async (video: boolean, screen: boolean) => {
      try {
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
        }
      } catch {}
      try {
        let stream: MediaStream;
        if (screen) {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { optional: [{ echoCancellation: true }] } as any }).catch(() => {
            return navigator.mediaDevices.getDisplayMedia({ video: true });
          });
        } else if (video) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        stream.getTracks().forEach((track) => {
          track.onended = () => {
            setScreenEnabled(false);
            setCameraEnabled(false);
            try { updateStream(false, false); } catch {}
          };
        });
        stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
        setMediaStream(stream);
      } catch (e) {
        console.error("Failed to get media", e);
        try {
          const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
          audio.getAudioTracks().forEach((t) => (t.enabled = !muted));
          setMediaStream(audio);
        } catch {}
        setCameraEnabled(false);
        setScreenEnabled(false);
      }
    },
    [muted, mediaStream]
  );

  const leaveVoice = useCallback(() => {
    if (currentUserId) setVoiceState(currentUserId, null, false, false, false);
  }, [currentUserId, setVoiceState]);

  const toggleMute = useCallback(() => {
    if (currentUserId && inVoice) setVoiceState(currentUserId, inVoice, !muted, deafened, false);
  }, [currentUserId, inVoice, muted, deafened, setVoiceState]);

  const toggleDeafen = useCallback(() => {
    if (currentUserId && inVoice) setVoiceState(currentUserId, inVoice, muted, !deafened, false);
  }, [currentUserId, inVoice, muted, deafened, setVoiceState]);

  const toggleCamera = useCallback(() => {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    setScreenEnabled(false);
    updateStream(next, false);
  }, [cameraEnabled, updateStream]);

  const toggleScreen = useCallback(() => {
    const next = !screenEnabled;
    setScreenEnabled(next);
    setCameraEnabled(false);
    updateStream(false, next);
  }, [screenEnabled, updateStream]);

  const reconnectAll = useCallback(() => {
    if (!managerRef.current || !currentUserId || !inVoice) return;
    const manager = managerRef.current;
    const channelUsers = Object.values(voiceStates).filter(
      (v) => v.channelId === inVoice && v.userId !== currentUserId
    );
    channelUsers.forEach((v) => manager.retryPeer(v.userId));
  }, [currentUserId, inVoice, voiceStates]);

  // Drag
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

  if (!currentUserId || !inVoice) return null;

  const channelMembers = Object.values(voiceStates).filter((v) => v.channelId === inVoice);
  const hasVideo = cameraEnabled || screenEnabled;

  const widget = (
    <div className="fixed z-[9999] select-none" style={{ left: position.x, top: position.y }}>
      <div
        className={cn(
          "rounded-2xl bg-[#1e1f22] border border-[#3f4147] shadow-2xl overflow-hidden flex flex-col",
          minimized ? "w-72" : hasVideo ? "w-[520px]" : "w-80"
        )}
      >
        {/* Title bar */}
        <div
          className="h-9 flex items-center justify-between px-3 bg-[#111214] cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-[#949ba4] flex-shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[#23a559] animate-pulse flex-shrink-0" />
              <span className="text-xs font-medium text-[#dbdee1] truncate">
                {channel && "name" in channel ? channel.name : "Voice"}
              </span>
              {server && (
                <span className="text-[10px] text-[#949ba4] truncate">— {server.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setShowSettings(!showSettings); setMicTestLoopback(false); }}
              className={cn(
                "p-1 rounded hover:bg-[#3f4147]",
                showSettings ? "text-white" : "text-[#949ba4] hover:text-white"
              )}
              title="Voice Settings"
            >
              <Settings className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 rounded text-[#949ba4] hover:text-white hover:bg-[#3f4147]"
            >
              {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            {/* Mic test panel */}
            {showSettings && (
              <div className="px-3 py-2.5 bg-[#111214] border-b border-[#3f4147] space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">
                  Microphone Test
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-[#b5bac1] flex-shrink-0" />
                  <div className="flex-1 h-2 bg-[#2b2d31] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${micLevel}%`,
                        background: micLevel > 60 ? "#f23f42" : micLevel > 30 ? "#f0b232" : "#23a559",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[#949ba4] w-7 text-right">{Math.round(micLevel)}%</span>
                </div>
                <button
                  onClick={() => setMicTestLoopback(!micTestLoopback)}
                  className={cn(
                    "w-full text-xs py-1.5 rounded-lg font-medium transition-colors",
                    micTestLoopback
                      ? "bg-[#f23f42] text-white hover:bg-[#da373c]"
                      : "bg-[#5865f2] text-white hover:bg-[#4752c4]"
                  )}
                >
                  {micTestLoopback ? "Stop Listening" : "Test Mic (Hear Yourself)"}
                </button>
                {micTestLoopback && (
                  <p className="text-[10px] text-[#f0b232]">
                    Loopback active — you are hearing your own microphone
                  </p>
                )}

                {/* Connection diagnostics */}
                {connDiags.size > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">Connections</div>
                    {Array.from(connDiags.values()).map((d) => {
                      const peer = users[d.userId];
                      return (
                        <div key={d.userId} className="flex items-center justify-between text-[10px]">
                          <span className="text-[#b5bac1] truncate">{peer?.username ?? d.userId.slice(0, 8)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded",
                            d.state === "connected" ? "bg-[#23a559]/20 text-[#23a559]" :
                            d.state === "failed" ? "bg-[#f23f42]/20 text-[#f23f42]" :
                            "bg-[#faa61a]/20 text-[#faa61a]"
                          )}>
                            {d.state} / {d.iceState}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={reconnectAll}
                  className="w-full mt-1 text-xs py-1.5 rounded-lg font-medium bg-[#3f4147] text-white hover:bg-[#4e5058] flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Reconnect All
                </button>
              </div>
            )}

            {/* Video area */}
            {hasVideo && (
              <div className="aspect-video bg-black relative">
                {mediaStream && (
                  <VideoPlayer stream={mediaStream} muted className="w-full h-full object-cover" />
                )}
                {remoteStreams.size > 0 && (
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {Array.from(remoteStreams.entries()).map(([uid, stream]) => {
                      if (stream.getVideoTracks().length === 0) return null;
                      return (
                        <div key={uid} className="w-24 h-16 rounded-lg overflow-hidden border border-[#3f4147]">
                          <VideoPlayer stream={stream} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Participants */}
            <div className="max-h-48 overflow-y-auto scroll-thin">
              {channelMembers.map((v) => {
                const user = users[v.userId];
                if (!user) return null;
                const isMe = v.userId === currentUserId;
                const hasRemote = remoteStreams.has(v.userId);
                const isSpeaking = speaking.has(v.userId);
                return (
                  <div key={v.userId} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2b2d31]">
                    {/* Avatar with speaking glow ring */}
                    <div
                      className={cn(
                        "relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-shadow duration-200",
                        isSpeaking && "ring-2 ring-[#23a559] shadow-[0_0_8px_rgba(35,165,89,0.5)]"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#5865f2] flex items-center justify-center">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {user.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {!isMe && (
                        <div
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e1f22]",
                            hasRemote ? "bg-[#23a559]" : "bg-[#949ba4]"
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "text-sm truncate block transition-colors",
                          isSpeaking ? "text-[#23a559] font-medium" : isMe ? "text-[#23a559] font-medium" : "text-[#dbdee1]"
                        )}
                      >
                        {user.username}
                        {isMe && " (You)"}
                      </span>
                      {!isMe && (
                        <span className="text-[10px] text-[#949ba4]">
                          {hasRemote ? "Connected" : "Connecting..."}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {v.muted && <MicOff className="w-3.5 h-3.5 text-[#f23f42]" />}
                      {v.deafened && <HeadphoneOff className="w-3.5 h-3.5 text-[#f23f42]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-1 px-3 py-2 bg-[#111214] border-t border-[#3f4147]">
          <CtrlBtn onClick={toggleMute} active={muted} danger={muted} title={muted ? "Unmute" : "Mute"}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </CtrlBtn>
          <CtrlBtn onClick={toggleDeafen} active={deafened} danger={deafened} title={deafened ? "Undeafen" : "Deafen"}>
            {deafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </CtrlBtn>
          <CtrlBtn onClick={toggleCamera} active={cameraEnabled} title="Camera">
            {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </CtrlBtn>
          <CtrlBtn onClick={toggleScreen} active={screenEnabled} title="Screen Share">
            <Monitor className="w-4 h-4" />
          </CtrlBtn>
          <CtrlBtn onClick={leaveVoice} danger title="Disconnect">
            <PhoneOff className="w-4 h-4" />
          </CtrlBtn>
        </div>
      </div>

      {/* Hidden audio elements for each remote peer */}
      {Array.from(remoteStreams.entries()).map(([uid, stream]) => (
        <RemoteAudio key={uid} stream={stream} deafened={deafened} />
      ))}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(widget, document.body);
}

function CtrlBtn({
  onClick, active, danger, title, children,
}: {
  onClick: () => void; active?: boolean; danger?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2.5 rounded-full transition-colors",
        danger ? "bg-[#f23f42] text-white hover:bg-[#da373c]"
          : active ? "bg-white text-black hover:bg-gray-200"
          : "bg-[#2b2d31] text-[#b5bac1] hover:bg-[#3f4147] hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function VideoPlayer({ stream, muted, className }: { stream: MediaStream; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function RemoteAudio({ stream, deafened }: { stream: MediaStream; deafened: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  useEffect(() => {
    if (ref.current) ref.current.muted = deafened;
  }, [deafened]);
  return <audio ref={ref} autoPlay playsInline />;
}
