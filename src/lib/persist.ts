const STORAGE_KEY = "discord-clone-data";
const DEBOUNCE_MS = 300;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export interface PersistedData {
  users: Record<string, import("./types").AuthUser>;
  roles: Record<string, import("./types").Role>;
  servers: Record<string, import("./types").Server>;
  channels: Record<string, import("./types").Channel>;
  members: Record<string, import("./types").Member>;
  messages: Record<string, import("./types").Message>;
  threads: Record<string, import("./types").Thread>;
  dmChannels: Record<string, import("./types").DMChannel>;
  readStates: Record<string, import("./types").ReadState>;
  voiceStates: Record<string, import("./types").VoiceState>;
}

export function loadFromStorage(): PersistedData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedData;
  } catch {
    return null;
  }
}

export function saveToStorage(data: PersistedData): void {
  if (typeof window === "undefined") return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveToStorageSync(data);
  }, DEBOUNCE_MS);
}

export function saveToStorageSync(data: PersistedData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to persist to localStorage", e);
  }
}
