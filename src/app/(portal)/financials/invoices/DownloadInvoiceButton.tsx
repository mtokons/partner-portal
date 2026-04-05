"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function DownloadInvoiceButton({ invoiceId }: { invoiceId: string }) {
  async function handleDownload() {
    const res = await fetch(`/api/invoice-pdf?id=${invoiceId}`);
    if (!res.ok) return alert("Failed to generate PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-1" /> PDF
    </Button>
  );
}
