"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Play, CheckCircle2, XCircle, ShieldCheck, Loader2, Edit3 } from "lucide-react";
import type { SalesOrder } from "@/types";
import { updateOrderStatusAction } from "../../actions";
import { toast } from "sonner";

export default function OrderActions({
  order,
  isAdmin,
  requiresPaymentVerification,
}: {
  order: SalesOrder;
  isAdmin: boolean;
  requiresPaymentVerification: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(status: "pending" | "in-progress" | "completed" | "cancelled") {
    setLoading(status);
    try {
      const result = await updateOrderStatusAction(order.id, status);
      if (!result.success) {
        toast.error(result.message || "Failed to update order status");
      } else {
        toast.success(`Order status updated to ${status}`);
        router.refresh();
      }
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {order.status === "pending" && (
        <Button
          size="sm"
          onClick={() => handleAction("in-progress")}
          disabled={loading !== null || (requiresPaymentVerification && !isAdmin)}
          className="gap-1.5 shadow-sm"
        >
          {loading === "in-progress" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : requiresPaymentVerification ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {loading === "in-progress" ? "Processing..." : requiresPaymentVerification ? "Verify Payment" : "Start"}
        </Button>
      )}
      {(order.status === "pending" || order.status === "in-progress") && (
        <Button
          size="sm"
          onClick={() => handleAction("completed")}
          disabled={loading !== null || (requiresPaymentVerification && !isAdmin)}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
        >
          {loading === "completed" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {loading === "completed" ? "Completing..." : requiresPaymentVerification ? "Verify & Complete" : "Complete Order"}
        </Button>
      )}
      {order.status !== "completed" && order.status !== "cancelled" && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { if (confirm("Are you sure you want to cancel this order?")) handleAction("cancelled"); }}
          disabled={loading !== null || (requiresPaymentVerification && !isAdmin)}
          className="gap-1.5 shadow-sm"
        >
          {loading === "cancelled" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Cancel Order
        </Button>
      )}
      {isAdmin && (
        <Link href={`/sales/orders/${order.id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm">
            <Edit3 className="h-4 w-4" /> Edit
          </Button>
        </Link>
      )}
    </div>
  );
}

