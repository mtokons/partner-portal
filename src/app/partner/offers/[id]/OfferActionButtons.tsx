"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPartnerOffer, deletePartnerOffer } from "../actions";
import { Send, Trash2 } from "lucide-react";

export default function OfferActionButtons({ offerId, status }: { offerId: string; status: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSend() {
    if (!confirm("Send this offer to the client via email?")) return;
    setSending(true);
    try {
      await sendPartnerOffer(offerId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this draft offer? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deletePartnerOffer(offerId);
      router.push("/partner/offers");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === "draft" && (
        <>
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending..." : "Send to Client"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </>
      )}
    </div>
  );
}
