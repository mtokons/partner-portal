"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface Props {
  id: string;
  href: string;
  read: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a notification row in a clickable link that:
 *   1. Marks the notification as read (best-effort, ignores failures).
 *   2. Navigates to the target route.
 *   3. Triggers a server-component refresh so badges update immediately.
 */
export default function NotificationItem({ id, href, read, children, className }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (pending) return;
    start(async () => {
      if (!read) {
        try {
          await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
        } catch {
          // ignore — navigation should still proceed
        }
      }
      router.push(href);
      router.refresh();
    });
  }

  return (
    <a
      href={href}
      onClick={onClick}
      className={`${className ?? ""} cursor-pointer block`}
      aria-busy={pending}
    >
      {children}
    </a>
  );
}
