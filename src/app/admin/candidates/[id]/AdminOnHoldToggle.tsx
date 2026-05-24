"use client";

import { useTransition } from "react";
import { toggleOnHoldAction } from "@/app/admin/candidates/actions";
import { ToggleLeft, ToggleRight } from "lucide-react";

interface AdminOnHoldToggleProps {
  candidateId: string;
  isOnHold: boolean;
}

export function AdminOnHoldToggle({ candidateId, isOnHold }: AdminOnHoldToggleProps) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleOnHoldAction(candidateId, !isOnHold);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
        isOnHold
          ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {isOnHold ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      {isOnHold ? "On Hold" : "Active"}
    </button>
  );
}
