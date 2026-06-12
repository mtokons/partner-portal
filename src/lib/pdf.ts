import jsPDF from "jspdf";
import type { Invoice, Order, Client } from "@/types";

const CSYM: Record<string, string> = {
  EUR: "EUR", BDT: "BDT", INR: "INR", USD: "USD", GBP: "GBP",
  AED: "AED", SAR: "SAR", MYR: "MYR", PKR: "PKR", TRY: "TRY",
};

function dp(v: number, _cur?: string, _rate?: number): string {
  return `EUR ${v.toFixed(2)}`;
}

export function generateInvoicePdf(invoice: Invoice, order?: Order, client?: Client, rate?: number, secondaryCurrency = "BDT", secondaryRate?: number): Uint8Array {
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
      const eurUnit = item.unitPrice;
      doc.text(dp(eurUnit, secondaryCurrency, secondaryRate || 1), 130, y);
      const lineTotal = item.quantity * item.unitPrice;
      doc.text(dp(lineTotal, secondaryCurrency, secondaryRate || 1), 160, y);
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
  const totalEur = invoice.amountEur ?? invoice.amount;
  doc.text(`Total: ${dp(totalEur, secondaryCurrency, secondaryRate || 1)}`, w - 120, y);

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
  rate?: number,
  totals?: { subtotal?: number; discount?: number; discountType?: "fixed" | "percent"; totalAmount?: number },
  secondaryCurrency = "BDT",
  secondaryRate?: number,
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
    doc.text(dp(item.price, secondaryCurrency, secondaryRate || 1), 130, y);
    doc.text(dp(lineTotal, secondaryCurrency, secondaryRate || 1), 160, y);
    y += 8;
  }

  // Authoritative totals from offer record (preferred over recomputed sum)
  const subtotal = totals?.subtotal ?? total;
  const discountAmt = totals?.discount ?? 0;
  const discountType = totals?.discountType ?? "fixed";
  const computedDiscountValue = discountType === "percent"
    ? Math.round((subtotal * (discountAmt / 100) + Number.EPSILON) * 100) / 100
    : discountAmt;
  const grandTotal = totals?.totalAmount ?? Math.max(0, subtotal - computedDiscountValue);

  y += 6;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Subtotal: ${dp(subtotal, secondaryCurrency, secondaryRate || 1)}`, w - 100, y);
  if (computedDiscountValue > 0) {
    y += 6;
    const dLabel = discountType === "percent" ? `Discount (${discountAmt}%)` : "Discount";
    doc.text(`${dLabel}: -EUR ${computedDiscountValue.toFixed(2)}`, w - 100, y);
  }
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text(`Grand Total: ${dp(grandTotal, secondaryCurrency, secondaryRate || 1)}`, w - 100, y);

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
