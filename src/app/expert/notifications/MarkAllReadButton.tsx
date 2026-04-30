"use client";

import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Call the server API endpoint rather than importing server-only libs here

export default function MarkAllReadButton(_props: { userId?: string }) {
  void _props;
  const router = useRouter();

  async function handleClick() {
    await fetch("/api/notifications/mark-all", { method: "POST" });
    router.refresh();
  }

  return (
    <button onClick={handleClick} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      Mark all as read
    </button>
  );
}
