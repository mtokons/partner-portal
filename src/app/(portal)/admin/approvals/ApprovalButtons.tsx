"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { approveUserAction, rejectUserAction } from "./actions";

interface ApprovalButtonsProps {
  uid: string;
}

export default function ApprovalButtons({ uid }: ApprovalButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setLoading("approve");
    await approveUserAction(uid);
    setLoading(null);
    router.refresh();
  }

  async function handleReject() {
    setLoading("reject");
    await rejectUserAction(uid);
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={handleApprove}
        disabled={loading !== null}
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
        title="Approve User"
      >
        {loading === "approve" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
      <Button
        size="sm"
        onClick={handleReject}
        disabled={loading !== null}
        variant="outline"
        className="text-white border-red-500/50 hover:bg-red-500/20"
        title="Reject User"
      >
        {loading === "reject" ? (
          <Loader2 className="h-4 w-4 animate-spin text-red-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        )}
      </Button>
    </div>
  );
}
