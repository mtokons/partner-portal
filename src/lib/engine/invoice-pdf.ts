import jsPDF from "jspdf";
import type { Invoice, Partner } from "@/types";

/**
 * Generate a professional invoice PDF.
 * Returns raw Uint8Array bytes.
 */
export function generateInvoicePdfBytes(
  invoice: Invoice,
  partner: Partner,
): Uint8Array {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, w, 22, "F");
  doc.setFontSize(14);
  doc.setTextColor(255);
  doc.text("SCCG Career Lab Germany", 20, 10);
  doc.setFontSize(10);
  doc.text("INVOICE", 20, 17);
  doc.setFontSize(9);
  doc.text(partner.name ?? "Partner", w - 20, 14, { align: "right" });

  let y = 34;

  // Invoice details
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Invoice No: ${invoice.invoiceNumber || invoice.id.slice(0, 8)}`, 20, y);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, y + 6);
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, y + 12);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, w - 20, y, { align: "right" });

  // Bill To
  y += 26;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Bill To:", 20, y);
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(invoice.clientName || "Client", 20, y + 8);

  // Separator
  y += 20;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);

  // Amount table header
  y += 10;
  doc.setFillColor(245, 247, 250);
  doc.rect(20, y - 5, w - 40, 10, "F");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Description", 25, y);
  doc.text("Amount (EUR)", w - 25, y, { align: "right" });

  // Amount row
  y += 12;
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text("Service Invoice", 25, y);
  doc.text(`\u20AC${invoice.amount.toFixed(2)}`, w - 25, y, { align: "right" });

  // Total
  y += 16;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
  doc.text("Total:", 25, y);
  doc.text(`\u20AC${invoice.amount.toFixed(2)}`, w - 25, y, { align: "right" });

  // Payment note
  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("All amounts are in EUR. Use the portal currency calculator for local equivalents.", 20, y);
  doc.text("Please reference the invoice number in your payment.", 20, y + 5);

  // Footer
  y += 20;
  doc.setDrawColor(220);
  doc.line(20, y, w - 20, y);
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("SCCG Career Lab Germany | www.mysccg.de | info@mysccg.de", w / 2, y, { align: "center" });

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
