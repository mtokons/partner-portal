"use client";

import { Eye, LogOut, AlertTriangle } from "lucide-react";
import { useTransition } from "react";
import { stopImpersonationAction } from "@/app/actions/impersonation";

interface Props {
  adminName: string;
  targetName: string;
  targetEmail: string;
  targetRoles: string[];
}

export default function ImpersonationBanner({ adminName, targetName, targetEmail, targetRoles }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleExit() {
    startTransition(async () => {
      await stopImpersonationAction();
    });
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-2.5
        bg-amber-500 text-slate-950 shadow-lg text-sm font-semibold"
      role="alert"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <Eye className="h-4 w-4 shrink-0" />
        <span className="truncate">
          <span className="opacity-70">Admin</span>{" "}
          <span>{adminName}</span>{" "}
          <span className="opacity-70">is viewing as</span>{" "}
          <span className="underline underline-offset-2">{targetName}</span>{" "}
          <span className="opacity-70 text-xs">({targetEmail})</span>
          {targetRoles.length > 0 && (
            <span className="ml-2 opacity-70 text-xs">[{targetRoles.join(", ")}]</span>
          )}
        </span>
      </div>

      <button
        onClick={handleExit}
        disabled={isPending}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/15 hover:bg-slate-950/25 transition-colors disabled:opacity-60 font-bold text-xs whitespace-nowrap"
      >
        <LogOut className="h-3.5 w-3.5" />
        {isPending ? "Exiting…" : "Exit — Return to Admin"}
      </button>
    </div>
  );
}
