import { getSocket } from "./socket";

export interface WebRTCStream {
  userId: string;
  stream: MediaStream;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  {
    urls: "turn:freeturn.net:3478",
    username: "free",
    credential: "free",
  },
  {
    urls: "turns:freeturn.net:5349",
    username: "free",
    credential: "free",
  },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type ConnectionDiag = {
  userId: string;
  state: string;
  iceState: string;
  candidateTypes: string[];
  connectedAt?: number;
  startedAt: number;
};

export class WebRTCManager {
  private peers = new Map<string, RTCPeerConnection>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;
  private onStream: (userId: string, stream: MediaStream) => void;
  private onRemoveStream: (userId: string) => void;
  private onDiagUpdate?: (diags: Map<string, ConnectionDiag>) => void;
  private currentUserId: string | null = null;
  private destroyed = false;
  private diags = new Map<string, ConnectionDiag>();

  constructor(
    onStream: (userId: string, stream: MediaStream) => void,
    onRemoveStream: (userId: string) => void,
    onDiagUpdate?: (diags: Map<string, ConnectionDiag>) => void
  ) {
    this.onStream = onStream;
    this.onRemoveStream = onRemoveStream;
    this.onDiagUpdate = onDiagUpdate;
  }

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.peers.forEach((pc) => {
      const senders = pc.getSenders();
      senders.forEach((s) => {
        try { pc.removeTrack(s); } catch {}
      });
      if (stream) {
        stream.getTracks().forEach((track) => {
          try { pc.addTrack(track, stream); } catch {}
        });
      }
    });
  }

  shouldInitiate(remoteUserId: string): boolean {
    if (!this.currentUserId) return false;
    return this.currentUserId < remoteUserId;
  }

  getDiags(): Map<string, ConnectionDiag> {
    return new Map(this.diags);
  }

  connectToPeer(userId: string) {
    if (this.destroyed) return;
    if (userId === this.currentUserId) return;
    if (this.peers.has(userId)) return;

    if (this.shouldInitiate(userId)) {
      console.log("[WebRTC] I initiate to", userId);
      this.createPeerAndOffer(userId);
    } else {
      console.log("[WebRTC] Waiting for offer from", userId);
    }
  }

  retryPeer(userId: string) {
    if (this.destroyed) return;
    if (userId === this.currentUserId) return;

    const existing = this.peers.get(userId);
    if (existing) {
      const state = existing.connectionState;
      if (state === "connected" || state === "connecting") return;
      console.log("[WebRTC] Retrying peer", userId, "state was", state);
      existing.close();
      this.peers.delete(userId);
      this.pendingCandidates.delete(userId);
    }

    console.log("[WebRTC] Force re-initiate to", userId);
    this.createPeerAndOffer(userId);
  }

  disconnectPeer(userId: string) {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
      this.pendingCandidates.delete(userId);
      this.diags.delete(userId);
      this.onRemoveStream(userId);
      this.emitDiags();
    }
  }

  leave() {
    this.destroyed = true;
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.pendingCandidates.clear();
    this.diags.clear();
    this.localStream = null;
  }

  async handleSignal(fromUserId: string, signal: any) {
    if (this.destroyed) return;

    if (signal.desc) {
      await this.handleDescription(fromUserId, signal.desc);
    } else if (signal.candidate) {
      await this.handleCandidate(fromUserId, signal.candidate);
    }
  }

  private async handleCandidate(userId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(userId);
    if (!pc) {
      if (!this.pendingCandidates.has(userId)) {
        this.pendingCandidates.set(userId, []);
      }
      this.pendingCandidates.get(userId)!.push(candidate);
      return;
    }

    if (pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn("[WebRTC] addIceCandidate error", e);
      }
    } else {
      if (!this.pendingCandidates.has(userId)) {
        this.pendingCandidates.set(userId, []);
      }
      this.pendingCandidates.get(userId)!.push(candidate);
    }
  }

  private async flushCandidates(userId: string) {
    const pc = this.peers.get(userId);
    const candidates = this.pendingCandidates.get(userId);
    if (!pc || !candidates || !pc.remoteDescription) return;

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn("[WebRTC] flush candidate error", e);
      }
    }
    this.pendingCandidates.delete(userId);
  }

  private async handleDescription(userId: string, desc: RTCSessionDescriptionInit) {
    if (desc.type === "offer") {
      await this.handleOffer(userId, desc);
    } else if (desc.type === "answer") {
      await this.handleAnswer(userId, desc);
    }
  }

  private async handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
    console.log("[WebRTC] Received offer from", userId);

    let pc = this.peers.get(userId);

    if (pc && pc.signalingState === "have-local-offer") {
      if (this.shouldInitiate(userId)) {
        console.log("[WebRTC] Glare detected, I'm initiator, ignoring remote offer");
        return;
      }
      console.log("[WebRTC] Glare detected, I yield, rolling back");
      pc.close();
      this.peers.delete(userId);
      pc = undefined;
    }

    if (!pc) {
      pc = this.createPeer(userId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await this.flushCandidates(userId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[WebRTC] Sending answer to", userId);
      this.sendSignal(userId, { desc: pc.localDescription });
    } catch (e) {
      console.error("[WebRTC] Error handling offer from", userId, e);
    }
  }

  private async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    console.log("[WebRTC] Received answer from", userId);
    const pc = this.peers.get(userId);
    if (!pc) {
      console.warn("[WebRTC] No peer for answer from", userId);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await this.flushCandidates(userId);
    } catch (e) {
      console.error("[WebRTC] Error handling answer from", userId, e);
    }
  }

  private async createPeerAndOffer(userId: string) {
    const pc = this.createPeer(userId);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Sending offer to", userId);
      this.sendSignal(userId, { desc: pc.localDescription });
    } catch (e) {
      console.error("[WebRTC] Error creating offer for", userId, e);
    }
  }

  private createPeer(userId: string): RTCPeerConnection {
    if (this.peers.has(userId)) {
      this.peers.get(userId)!.close();
      this.peers.delete(userId);
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.diags.set(userId, {
      userId,
      state: "new",
      iceState: "new",
      candidateTypes: [],
      startedAt: Date.now(),
    });
    this.emitDiags();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(userId, { candidate: event.candidate });
        const diag = this.diags.get(userId);
        if (diag && event.candidate.type) {
          if (!diag.candidateTypes.includes(event.candidate.type)) {
            diag.candidateTypes.push(event.candidate.type);
            this.emitDiags();
          }
        }
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] Got remote track from", userId, event.track.kind);
      if (event.streams[0]) {
        this.onStream(userId, event.streams[0]);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state for", userId, ":", pc.iceConnectionState);
      const diag = this.diags.get(userId);
      if (diag) {
        diag.iceState = pc.iceConnectionState;
        this.emitDiags();
      }
      if (pc.iceConnectionState === "failed") {
        console.log("[WebRTC] ICE failed for", userId, ", restarting");
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state for", userId, ":", pc.connectionState);
      const diag = this.diags.get(userId);
      if (diag) {
        diag.state = pc.connectionState;
        if (pc.connectionState === "connected" && !diag.connectedAt) {
          diag.connectedAt = Date.now();
        }
        this.emitDiags();
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.peers.delete(userId);
        this.onRemoveStream(userId);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (pc.signalingState !== "stable") return;
      if (!this.shouldInitiate(userId)) return;
      console.log("[WebRTC] Renegotiation needed with", userId);
      try {
        const offer = await pc.createOffer();
        if (pc.signalingState !== "stable") return;
        await pc.setLocalDescription(offer);
        this.sendSignal(userId, { desc: pc.localDescription });
      } catch (e) {
        console.error("[WebRTC] Renegotiation error", e);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try { pc.addTrack(track, this.localStream!); } catch {}
      });
    }

    this.peers.set(userId, pc);
    return pc;
  }

  private sendSignal(targetId: string, signal: any) {
    const sock = getSocket();
    if (sock) {
      sock.emit("webrtc:signal", { targetId, signal });
    }
  }

  private emitDiags() {
    this.onDiagUpdate?.(new Map(this.diags));
  }
}
