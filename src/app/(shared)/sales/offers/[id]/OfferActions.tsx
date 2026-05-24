"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, XCircle, Trash2, ArrowRightCircle, Mail, Download } from "lucide-react";
import type { SalesOffer } from "@/types";
import {
  updateOfferStatusAction,
  deleteOfferAction,
  convertOfferToOrderAction,
  sendOfferEmailAction,
} from "../../actions";

export default function OfferActions({ offer }: { offer: SalesOffer }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: string) {
    setLoading(action);
    try {
      let result;
      switch (action) {
        case "send-email":
          result = await sendOfferEmailAction(offer.id);
          break;
        case "accept":
          result = await updateOfferStatusAction(offer.id, "accepted");
          break;
        case "reject":
          result = await updateOfferStatusAction(offer.id, "rejected");
          break;
        case "delete":
          result = await deleteOfferAction(offer.id);
          if (result.success) { router.push("/sales/offers"); return; }
          break;
        case "convert":
          result = await convertOfferToOrderAction(offer.id);
          if (result.success && "orderId" in result) {
            router.push(`/sales/orders/${result.orderId}`);
            return;
          }
          break;
      }
      if (result && !result.success && "message" in result) {
        alert(result.message);
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function handleDownloadPdf() {
    window.open(`/api/offer-pdf?id=${offer.id}`, "_blank");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Download PDF */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPdf}
        className="gap-1"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </Button>

      {/* Send Email with Accept/Reject buttons */}
      {(offer.status === "draft" || offer.status === "sent") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction("send-email")}
          disabled={loading !== null}
          className="gap-1"
        >
          <Mail className="h-4 w-4" />
          {loading === "send-email" ? "Sending..." : "Send Email"}
        </Button>
      )}

      {/* Accept (manual — in case client accepts verbally) */}
      {offer.status === "sent" && (
        <Button
          size="sm"
          onClick={() => handleAction("accept")}
          disabled={loading !== null}
          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          {loading === "accept" ? "..." : "Mark Accepted"}
        </Button>
      )}

      {/* Reject (manual) */}
      {offer.status === "sent" && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
          className="gap-1"
        >
          <XCircle className="h-4 w-4" />
          {loading === "reject" ? "..." : "Mark Rejected"}
        </Button>
      )}

      {/* Convert to Order */}
      {offer.status === "accepted" && !offer.salesOrderId && (
        <Button
          size="sm"
          onClick={() => handleAction("convert")}
          disabled={loading !== null}
          className="gap-1"
        >
          <ArrowRightCircle className="h-4 w-4" />
          {loading === "convert" ? "Converting..." : "Convert to Order"}
        </Button>
      )}

      {/* Delete (draft only) */}
      {offer.status === "draft" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("Delete this draft offer?")) handleAction("delete");
          }}
          disabled={loading !== null}
          className="gap-1 text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      )}
    </div>
  );
}
