"use client";

import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Call the server API endpoint rather than importing server-only libs here

export default function MarkAllReadButton({ userId }: { userId: string }) {
  const router = useRouter();

  async function handleClick() {
    await fetch("/api/notifications/mark-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.refresh();
  }

  return (
    <button onClick={handleClick} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      Mark all as read
    </button>
  );
}
