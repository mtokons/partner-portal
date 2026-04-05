import jsPDF from "jspdf";
import type { Invoice, Order, Client } from "@/types";

export function generateInvoicePdf(invoice: Invoice, order?: Order, client?: Client, rate?: number): Uint8Array {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(24);
  doc.setTextColor(30, 64, 175);
  doc.text("INVOICE", 20, 30);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Invoice #: ${invoice.id.toUpperCase()}`, 20, 42);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 48);
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, 54);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 60);

  // Client info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Bill To:", 20, 78);
  doc.setFontSize(10);
  doc.text(client?.name || invoice.clientName || "—", 20, 86);
  if (client?.company) doc.text(client.company, 20, 92);
  if (client?.email) doc.text(client.email, 20, 98);
  if (client?.address) doc.text(client.address, 20, 104);

  // Items table
  let y = 120;
  doc.setFillColor(30, 64, 175);
  doc.rect(20, y, w - 40, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text("Item", 22, y + 6);
  doc.text("Qty", 110, y + 6);
  doc.text("Price", 130, y + 6);
  doc.text("Total", 160, y + 6);
  y += 12;

  doc.setTextColor(0);
  if (order?.items) {
    for (const item of order.items) {
      doc.text(item.productName, 22, y);
      doc.text(String(item.quantity), 110, y);
      // unitPrice assumed in BDT; show BDT primary and EUR equivalent if available
      const eurUnit = rate ? ((item.unitPrice * rate).toFixed(2)) : null;
      doc.text(`BDT ${item.unitPrice.toFixed(2)}${eurUnit ? ` · €${eurUnit}` : ""}`, 130, y);
      const lineTotal = item.quantity * item.unitPrice;
      const eurLine = rate ? ((lineTotal * rate).toFixed(2)) : null;
      doc.text(`BDT ${lineTotal.toFixed(2)}${eurLine ? ` · €${eurLine}` : ""}`, 160, y);
      y += 8;
    }
  }

  // Total
  y += 8;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  const eurTotal = invoice.amountEur ?? (rate ? Math.round((invoice.amount * rate + Number.EPSILON) * 100) / 100 : undefined);
  doc.text(`Total: BDT ${invoice.amount.toFixed(2)}${eurTotal ? ` · €${eurTotal.toFixed(2)}` : ""}`, w - 120, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Thank you for your business!", 20, 280);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

export function generateSalesOfferPdf(
  partnerCompany: string,
  clientName: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  validUntil: string,
  rate?: number
): Uint8Array {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(24);
  doc.setTextColor(30, 64, 175);
  doc.text("SALES OFFER", 20, 30);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`From: ${partnerCompany}`, 20, 42);
  doc.text(`To: ${clientName}`, 20, 48);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 54);
  doc.text(`Valid Until: ${new Date(validUntil).toLocaleDateString()}`, 20, 60);

  // Items
  let y = 78;
  doc.setFillColor(30, 64, 175);
  doc.rect(20, y, w - 40, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text("Product", 22, y + 6);
  doc.text("Qty", 110, y + 6);
  doc.text("Unit Price", 130, y + 6);
  doc.text("Total", 160, y + 6);
  y += 12;

  doc.setTextColor(0);
  let total = 0;
  for (const item of items) {
    const lineTotal = item.quantity * item.price;
    total += lineTotal;
    doc.text(item.name, 22, y);
    doc.text(String(item.quantity), 110, y);
    const eurUnit = rate ? (item.price * rate).toFixed(2) : null;
    const eurLine = rate ? (lineTotal * rate).toFixed(2) : null;
    doc.text(`BDT ${item.price.toFixed(2)}${eurUnit ? ` · €${eurUnit}` : ""}`, 130, y);
    doc.text(`BDT ${lineTotal.toFixed(2)}${eurLine ? ` · €${eurLine}` : ""}`, 160, y);
    y += 8;
  }

  y += 8;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  const eurTotal = rate ? (total * rate).toFixed(2) : null;
  doc.text(`Grand Total: BDT ${total.toFixed(2)}${eurTotal ? ` · €${eurTotal}` : ""}`, w - 80, y);

  // Terms
  y += 20;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Terms & Conditions:", 20, y);
  y += 6;
  doc.text("1. Prices are valid until the date specified above.", 20, y);
  y += 5;
  doc.text("2. Payment terms: Net 30 days from delivery.", 20, y);
  y += 5;
  doc.text("3. All prices are exclusive of applicable taxes.", 20, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("This is a non-binding offer. Please confirm to proceed.", 20, 280);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
