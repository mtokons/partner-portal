"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Connects to the SSE notifications stream and triggers a router.refresh()
 * whenever a new notification arrives, causing server components (sidebars,
 * notification pages) to re-fetch and show the new count/items.
 *
 * Mount once per authenticated portal layout.
 */
export default function NotificationsLiveBridge() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    let es: EventSource | null = null;
    let cancelled = false;
    let retry = 0;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource("/api/notifications/stream");
      es.addEventListener("notification", () => {
        // Refresh server components so unread badges & lists update.
        router.refresh();
      });
      es.onerror = () => {
        if (!es) return;
        es.close();
        es = null;
        // Exponential backoff (max 30s).
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(retry, 5));
        retry += 1;
        setTimeout(connect, delay);
      };
      es.onopen = () => {
        retry = 0;
      };
    };
    connect();

    return () => {
      cancelled = true;
      if (es) es.close();
    };
  }, [router]);

  return null;
}
