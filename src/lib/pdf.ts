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
  items: Array<{ name: string; quantity: number; price: number; description?: string; sessions?: number; includes?: string[] }>,

  validUntil: string,
  rate?: number,
  totals?: { subtotal?: number; discount?: number; discountType?: "fixed" | "percent"; totalAmount?: number },
  secondaryCurrency = "BDT",
  secondaryRate?: number,
  partnerLogo?: { base64: string; mime: string },
): Uint8Array {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // ── Partner logo ────────────────────────────────────────────────────────
  let headerY = 30;
  if (partnerLogo?.base64) {
    try {
      const fmt = partnerLogo.mime.includes("jpeg") || partnerLogo.mime.includes("jpg") ? "JPEG" : "PNG";
      const dataUrl = `data:${partnerLogo.mime};base64,${partnerLogo.base64}`;
      doc.addImage(dataUrl, fmt, 20, 10, 40, 14);
      headerY = 34;
    } catch {
      // Logo embedding failed — continue without it
    }
  }

  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 64, 175);
  doc.text("SERVICE OFFER", w - 20, headerY, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`From: ${partnerCompany}`, 20, headerY + 10);
  doc.text(`To: ${clientName}`, 20, headerY + 16);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, headerY + 22);
  doc.text(`Valid Until: ${new Date(validUntil).toLocaleDateString()}`, 20, headerY + 28);

  // Items table
  let y = headerY + 46;
  doc.setFillColor(30, 64, 175);
  doc.rect(20, y, w - 40, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text("Service", 22, y + 6);
  doc.text("Qty", 120, y + 6);
  doc.text("Unit Price", 135, y + 6);
  doc.text("Total", 163, y + 6);
  y += 12;

  doc.setTextColor(0);
  let total = 0;
  for (const item of items) {
    const lineTotal = item.quantity * item.price;
    total += lineTotal;

    // Service name (bold)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(item.name, 22, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(item.quantity), 120, y);
    doc.text(dp(item.price, secondaryCurrency, secondaryRate || 1), 135, y);
    doc.text(dp(lineTotal, secondaryCurrency, secondaryRate || 1), 163, y);
    y += 6;

    // Description (smaller, grey)
    if (item.description) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      const descLines = doc.splitTextToSize(item.description, 90);
      for (const line of descLines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 22, y);
        y += 5;
      }
      doc.setTextColor(0);
    }
    if (item.includes && item.includes.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      for (const feat of item.includes) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`✓ ${feat}`, 24, y);
        y += 4.5;
      }
      doc.setTextColor(0);
    } else if (item.sessions) {
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(`✓ Includes ${item.sessions} expert session${item.sessions !== 1 ? "s" : ""}`, 22, y);
      doc.setTextColor(0);
      y += 5;
    }

    // Row separator
    doc.setDrawColor(230);
    doc.line(20, y, w - 20, y);
    y += 5;

    if (y > 260) { doc.addPage(); y = 20; }
  }

  // Totals
  const subtotal = totals?.subtotal ?? total;
  const discountAmt = totals?.discount ?? 0;
  const discountType = totals?.discountType ?? "fixed";
  const computedDiscountValue = discountType === "percent"
    ? Math.round((subtotal * (discountAmt / 100) + Number.EPSILON) * 100) / 100
    : discountAmt;
  const grandTotal = totals?.totalAmount ?? Math.max(0, subtotal - computedDiscountValue);

  y += 4;
  doc.setDrawColor(180);
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
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: ${dp(grandTotal, secondaryCurrency, secondaryRate || 1)}`, w - 100, y);
  doc.setFont("helvetica", "normal");

  // Terms
  y += 20;
  if (y > 250) { doc.addPage(); y = 20; }
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
  doc.text("This is a non-binding offer. Please confirm to proceed.", 20, 287);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

/**
 * Generates a clean, formal A4 landscape Certificate of Cooperation.
 * Plain white background with black text — matches the official SCCG template:
 * a logo row, title, the two cooperating parties, a description paragraph,
 * issue date, two signatory blocks, and a small verification QR + code.
 */
export function generateCooperationCertificate(data: {
  certCode: string;
  issuedAt: string;             // ISO date
  partnerName: string;          // SCCG direct partner (who generates)
  partnerCity: string;
  subPartnerName: string;       // Indirect partner / institute
  subPartnerCity: string;
  subPartnerIndustry?: string;
  sccgLogoBase64?: string;      // base64 PNG/JPEG
  partnerLogoBase64?: string;
  partnerLogoMime?: string;
  subPartnerLogoBase64?: string;
  subPartnerLogoMime?: string;
  qrDataUrl?: string;           // base64 data-URL of QR code image
}): Uint8Array {
  // A4 landscape: 297 x 210 mm
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const CX = W / 2;
  const INK: [number, number, number] = [20, 20, 20];
  const GREY: [number, number, number] = [90, 90, 90];

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  // Subtle thin frame
  doc.setDrawColor(170, 170, 170);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, W - 20, H - 20);

  // ── Logo row (SCCG · Partner · Institute) ─────────────────────────────────
  const logoY = 20;
  const logoH = 14;
  const logoW = 34;
  const slots = [
    { cx: CX - 95, label: "SCCG", logo: data.sccgLogoBase64, mime: "image/png" },
    { cx: CX,      label: data.partnerName, logo: data.partnerLogoBase64, mime: data.partnerLogoMime || "image/png" },
    { cx: CX + 95, label: data.subPartnerName, logo: data.subPartnerLogoBase64, mime: data.subPartnerLogoMime || "image/png" },
  ];
  slots.forEach((s) => {
    let drew = false;
    if (s.logo) {
      try {
        const fmt = (s.mime || "").includes("jpeg") || (s.mime || "").includes("jpg") ? "JPEG" : "PNG";
        doc.addImage(`data:${s.mime};base64,${s.logo}`, fmt, s.cx - logoW / 2, logoY, logoW, logoH);
        drew = true;
      } catch { /* fall back to text label */ }
    }
    if (!drew) {
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(s.label, logoW + 10) as string[];
      doc.text(lines[0], s.cx, logoY + logoH / 2 + 2, { align: "center" });
    }
  });

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...INK);
  doc.text("CERTIFICATE OF COOPERATION", CX, 52, { align: "center" });

  // ── Body ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("This is to certify that", CX, 68, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(data.partnerName, CX, 80, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("(Regional Partner of SCCG Career Lab Germany)", CX, 88, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("AND", CX, 98, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.subPartnerName, CX, 108, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(
    "have established an official cooperation for academic and professional collaboration.",
    CX, 117, { align: "center" }
  );

  // Description paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GREY);
  const para =
    "This partnership reflects their joint commitment to supporting candidate identification, " +
    "preparation, and participation in international career development programs under SCCG " +
    "Career Lab Germany. This cooperation is non-commercial in nature and is based on mutual " +
    "collaboration for educational and career advancement purposes.";
  const paraLines = doc.splitTextToSize(para, 230) as string[];
  let py = 128;
  paraLines.forEach((line) => {
    doc.text(line, CX, py, { align: "center" });
    py += 6;
  });

  // ── Issued on ───────────────────────────────────────────────────────────────
  const issuedDate = (() => {
    try { return new Date(data.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return data.issuedAt; }
  })();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`Issued on: ${issuedDate}`, CX, py + 6, { align: "center" });

  // ── Signature blocks ────────────────────────────────────────────────────────
  const sigY = 182;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.line(28, sigY, 98, sigY);
  doc.line(W - 98, sigY, W - 28, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Authorized Signatory", 28, sigY + 6);
  doc.text("Authorized Signatory", W - 98, sigY + 6);
  doc.setFont("helvetica", "bold");
  doc.text(data.partnerName, 28, sigY + 12);
  doc.text(data.subPartnerName, W - 98, sigY + 12);

  // ── Verification (small, centered) ──────────────────────────────────────────
  if (data.qrDataUrl) {
    try {
      doc.addImage(data.qrDataUrl, "PNG", CX - 9, sigY - 16, 18, 18);
    } catch { /* skip */ }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text(`Certificate No: ${data.certCode}`, CX, sigY + 4, { align: "center" });
  doc.text(`Verify at portal.mysccg.de/verify/${data.certCode}`, CX, sigY + 8, { align: "center" });

  return doc.output("blob") as unknown as Uint8Array;
}
