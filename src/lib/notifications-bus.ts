// Lightweight in-process pub/sub for real-time notifications.
// Survives module hot-reload via globalThis to avoid losing subscribers in dev.

import type { AppNotification } from "@/types";

type Listener = (n: AppNotification) => void;

interface Bus {
  listeners: Map<string, Set<Listener>>; // userId -> listeners
}

const g = globalThis as unknown as { __notifBus?: Bus };
if (!g.__notifBus) {
  g.__notifBus = { listeners: new Map() };
}
const bus = g.__notifBus;

export function subscribe(userId: string, fn: Listener): () => void {
  let set = bus.listeners.get(userId);
  if (!set) {
    set = new Set();
    bus.listeners.set(userId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) bus.listeners.delete(userId);
  };
}

export function publish(notification: AppNotification): void {
  const set = bus.listeners.get(notification.userId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(notification);
    } catch {
      // ignore listener errors
    }
  }
}
