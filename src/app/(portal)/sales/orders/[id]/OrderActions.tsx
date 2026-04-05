"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, XCircle } from "lucide-react";
import type { SalesOrder } from "@/types";
import { updateOrderStatusAction } from "../../actions";

export default function OrderActions({ order }: { order: SalesOrder }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(status: "pending" | "in-progress" | "completed" | "cancelled") {
    setLoading(status);
    try {
      const result = await updateOrderStatusAction(order.id, status);
      if (!result.success) alert(result.message);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {order.status === "pending" && (
        <Button size="sm" onClick={() => handleAction("in-progress")} disabled={loading !== null} className="gap-1">
          <Play className="h-4 w-4" />
          {loading === "in-progress" ? "..." : "Start"}
        </Button>
      )}
      {(order.status === "pending" || order.status === "in-progress") && (
        <Button
          size="sm"
          onClick={() => handleAction("completed")}
          disabled={loading !== null}
          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          {loading === "completed" ? "..." : "Complete"}
        </Button>
      )}
      {order.status !== "completed" && order.status !== "cancelled" && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { if (confirm("Cancel this order?")) handleAction("cancelled"); }}
          disabled={loading !== null}
          className="gap-1"
        >
          <XCircle className="h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  );
}
