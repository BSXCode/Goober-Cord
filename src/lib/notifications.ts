"use client";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type: "mention" | "dm" | "friend_request" | "info";
  timestamp: number;
}

type Listener = (notifs: AppNotification[]) => void;

let notifications: AppNotification[] = [];
const listeners = new Set<Listener>();

function emit() {
  const copy = [...notifications];
  listeners.forEach((fn) => fn(copy));
}

export function pushNotification(n: Omit<AppNotification, "id" | "timestamp">) {
  const notif: AppNotification = {
    ...n,
    id: Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
  };
  notifications = [notif, ...notifications].slice(0, 10);
  emit();

  setTimeout(() => {
    dismissNotification(notif.id);
  }, 6000);
}

export function dismissNotification(id: string) {
  notifications = notifications.filter((n) => n.id !== id);
  emit();
}

export function onNotifications(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getNotifications(): AppNotification[] {
  return [...notifications];
}
