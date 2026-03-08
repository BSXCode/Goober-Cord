"use client";

const SOUND_ENABLED_KEY = "gc-sounds-enabled";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

export function getSoundsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  if (stored === null) return true;
  return stored === "true";
}

export function setSoundsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  endFrequency?: number
) {
  const audio = getContext();
  if (!audio) return;

  try {
    if (audio.state === "suspended") audio.resume();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audio.currentTime);
    if (endFrequency !== undefined) {
      osc.frequency.linearRampToValueAtTime(
        endFrequency,
        audio.currentTime + durationMs / 1000
      );
    }
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + durationMs / 1000
    );
    osc.start(audio.currentTime);
    osc.stop(audio.currentTime + durationMs / 1000);
  } catch {}
}

export function playPing() {
  if (!getSoundsEnabled()) return;
  playTone(880, 80, "sine", 0.2);
  setTimeout(() => playTone(1100, 120, "sine", 0.15), 60);
}

export function playMessage() {
  if (!getSoundsEnabled()) return;
  playTone(523, 100, "sine", 0.12);
  setTimeout(() => playTone(659, 100, "sine", 0.1), 80);
}

export function playSend() {
  if (!getSoundsEnabled()) return;
  playTone(400, 30, "sine", 0.08);
}

export function playJoin() {
  if (!getSoundsEnabled()) return;
  playTone(440, 150, "triangle", 0.15, 660);
}

export function playLeave() {
  if (!getSoundsEnabled()) return;
  playTone(660, 150, "triangle", 0.15, 440);
}

export function playDeafen() {
  if (!getSoundsEnabled()) return;
  playTone(200, 60, "square", 0.12);
}

export function playMute() {
  if (!getSoundsEnabled()) return;
  playTone(300, 40, "square", 0.1);
}

export function playCall() {
  if (!getSoundsEnabled()) return;
  const freqs = [800, 1000, 800, 1000, 800, 1000];
  freqs.forEach((f, i) => {
    setTimeout(() => playTone(f, 100, "sine", 0.15), i * 200);
  });
}

export function playError() {
  if (!getSoundsEnabled()) return;
  playTone(150, 200, "sawtooth", 0.15);
}

export function playSuccess() {
  if (!getSoundsEnabled()) return;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 80, "sine", 0.12), i * 60);
  });
}

export function playTyping() {
  if (!getSoundsEnabled()) return;
  playTone(2000, 15, "sine", 0.03);
}

export function playReaction() {
  if (!getSoundsEnabled()) return;
  playTone(600, 50, "sine", 0.12, 800);
}

export function playNavigate() {
  if (!getSoundsEnabled()) return;
  playTone(350, 80, "triangle", 0.1, 500);
}

export function playConnect() {
  if (!getSoundsEnabled()) return;
  const notes = [261.63, 329.63, 391.99, 523.25];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 100, "sine", 0.12), i * 80);
  });
}

export function playDisconnect() {
  if (!getSoundsEnabled()) return;
  const notes = [523.25, 391.99, 329.63, 261.63];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 100, "sine", 0.12), i * 80);
  });
}
