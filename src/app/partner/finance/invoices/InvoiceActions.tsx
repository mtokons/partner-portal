"use client";

import { useState, useTransition } from "react";
import { Download, Send, Loader2 } from "lucide-react";
import { sendInvoiceToClientAction } from "./actions";

interface InvoiceActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
}

export default function InvoiceActions({ invoiceId, invoiceNumber, status }: InvoiceActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function handleDownload() {
    const a = document.createElement("a");
    a.href = `/api/invoice-pdf?id=${invoiceId}`;
    a.download = `invoice-${invoiceNumber || invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleSend() {
    setSendStatus("sending");
    startTransition(async () => {
      try {
        await sendInvoiceToClientAction(invoiceId);
        setSendStatus("sent");
        setTimeout(() => setSendStatus("idle"), 3000);
      } catch {
        setSendStatus("error");
        setTimeout(() => setSendStatus("idle"), 3000);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={handleDownload}
        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Download PDF"
      >
        <Download className="w-4 h-4" />
      </button>
      {status !== "paid" && status !== "cancelled" && (
        <button
          onClick={handleSend}
          disabled={isPending || sendStatus === "sending"}
          className="p-2 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors disabled:opacity-50"
          title={sendStatus === "sent" ? "Sent!" : sendStatus === "error" ? "Failed" : "Send to Client"}
        >
          {sendStatus === "sending" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : sendStatus === "sent" ? (
            <Send className="w-4 h-4 text-emerald-500" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}
