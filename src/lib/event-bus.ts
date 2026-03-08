/**
 * In-app event bus to simulate WebSocket events.
 * Supports BroadcastChannel for multi-tab sync.
 */

export type EventType =
  | "message:create"
  | "message:update"
  | "message:delete"
  | "reaction:add"
  | "reaction:remove"
  | "typing:start"
  | "typing:stop"
  | "presence:update"
  | "read:ack"
  | "voice:join"
  | "voice:leave"
  | "voice:state";

export interface BusPayload {
  "message:create": { message: import("./types").Message };
  "message:update": { message: import("./types").Message };
  "message:delete": { channelId: string; messageId: string };
  "reaction:add": { channelId: string; messageId: string; emoji: string; userId: string };
  "reaction:remove": { channelId: string; messageId: string; emoji: string; userId: string };
  "typing:start": { channelId: string; userId: string };
  "typing:stop": { channelId: string; userId: string };
  "presence:update": { userId: string; status: import("./types").PresenceStatus; customStatus?: string };
  "read:ack": { channelId: string; userId: string; lastMessageId: string | null };
  "voice:join": { userId: string; channelId: string };
  "voice:leave": { userId: string; channelId: string };
  "voice:state": { userId: string; channelId: string | null; muted: boolean; deafened: boolean; speaking: boolean };
}

type Handler<T extends EventType> = (payload: BusPayload[T]) => void;

const handlers: Map<EventType, Set<Handler<EventType>>> = new Map();
const BROADCAST_CHANNEL_NAME = "discord-clone-events";
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

function getHandlers(event: EventType): Set<Handler<EventType>> {
  if (!handlers.has(event)) handlers.set(event, new Set());
  return handlers.get(event)!;
}

export function subscribe<T extends EventType>(event: T, handler: Handler<T>): () => void {
  const set = getHandlers(event);
  set.add(handler as Handler<EventType>);
  return () => set.delete(handler as Handler<EventType>);
}

export function emit<T extends EventType>(event: T, payload: BusPayload[T], fromBroadcast = false): void {
  if (!fromBroadcast && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ event, payload });
    } catch {
      // ignore
    }
  }
  getHandlers(event).forEach((h) => {
    try {
      h(payload);
    } catch (e) {
      console.error("[EventBus]", event, e);
    }
  });
}

if (broadcastChannel) {
  broadcastChannel.onmessage = (e: MessageEvent<{ event: EventType; payload: unknown }>) => {
    const { event, payload } = e.data;
    if (event && payload !== undefined) emit(event, payload as BusPayload[EventType], true);
  };
}

export const eventBus = { subscribe, emit };
