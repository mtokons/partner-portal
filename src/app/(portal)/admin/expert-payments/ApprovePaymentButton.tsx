"use client";

import { useState } from "react";
import { approvePaymentAction } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ApprovePaymentButton({ paymentId, adminId }: { paymentId: string; adminId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      await approvePaymentAction(paymentId, adminId);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleApprove}
      disabled={loading}
      className={cn(buttonVariants({ size: "sm" }), "bg-blue-600 hover:bg-blue-700 disabled:opacity-60")}
    >
      {loading ? "Approving…" : "Approve"}
    </button>
  );
}
