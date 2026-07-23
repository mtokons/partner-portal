import jsPDF from "jspdf";
import type { Candidate, CandidateService, Partner } from "@/types";
import type { FinancialSplitResult } from "@/lib/engine/financial-split";

export function generateCandidateOfferPdf(
  candidate: Candidate,
  partner: Partner,
  services: CandidateService[],
  split: FinancialSplitResult
): Uint8Array {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Dual-branded header
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, w, 22, "F");
  doc.setFontSize(14);
  doc.setTextColor(255);
  doc.text("SCCG — Service Offer", 20, 14);
  doc.setFontSize(9);
  doc.text(partner.name ?? "Partner", w - 20, 14, { align: "right" });

  let y = 34;

  // Offer meta
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Offer Date: ${new Date().toLocaleDateString()}`, 20, y);
  doc.text(`Submission ID: ${candidate.submissionId ?? candidate.sccgId}`, 20, y + 6);

  // Candidate info
  y += 20;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Candidate", 20, y);
  doc.setFontSize(9);
  doc.setTextColor(60);
  const info: [string, string][] = [
    ["Name", candidate.fullName],
    ["Email", candidate.email],
    ["Nationality", candidate.nationality],
    ["Workflow", candidate.workflowCategory],
  ];
  info.forEach(([label, value], i) => {
    doc.text(`${label}: ${value}`, 20, y + 8 + i * 6);
  });

  // Services table
  y += 48;
  doc.setFillColor(30, 64, 175);
  doc.rect(20, y, w - 40, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text("Service", 22, y + 5.5);
  doc.text("Type", 110, y + 5.5);
  doc.text("Total (€)", w - 22, y + 5.5, { align: "right" });
  y += 12;

  doc.setTextColor(0);
  doc.setFontSize(9);
  for (const svc of services) {
    doc.text(svc.serviceName, 22, y);
    doc.text(svc.packageType.replace(/-/g, " "), 110, y);
    doc.text(`€${svc.totalPrice.toFixed(2)}`, w - 22, y, { align: "right" });
    y += 7;
  }

  // Financial split summary
  y += 6;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text(`Total Service Fee:`, 20, y);
  doc.text(`€${split.totalServiceFee.toFixed(2)}`, w - 22, y, { align: "right" });
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(`Required Deposit (30%):`, 20, y);
  doc.text(`€${split.depositAmount.toFixed(2)}`, w - 22, y, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("SCCG — Proud to partner for global opportunities.", 20, 280);

  return new Uint8Array(doc.output("arraybuffer"));
}

export function generateCandidateInvoicePdf(
  candidate: Candidate,
  services: CandidateService[],
  split: FinancialSplitResult,
  invoiceNumber: string
): Uint8Array {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, w, 22, "F");
  doc.setFontSize(14);
  doc.setTextColor(255);
  doc.text("INVOICE", 20, 14);
  doc.setFontSize(9);
  doc.text("SCCG Consulting Group", w - 20, 14, { align: "right" });

  let y = 34;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Invoice #: ${invoiceNumber}`, 20, y);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y + 6);

  // Bill to
  y += 20;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Bill To:", 20, y);
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(candidate.fullName, 20, y + 8);
  doc.text(candidate.email, 20, y + 14);
  if (candidate.address) doc.text(candidate.address, 20, y + 20);

  // Services table
  y += 36;
  doc.setFillColor(30, 64, 175);
  doc.rect(20, y, w - 40, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text("Service", 22, y + 5.5);
  doc.text("Qty", 115, y + 5.5);
  doc.text("Price (€)", w - 22, y + 5.5, { align: "right" });
  y += 12;

  doc.setTextColor(0);
  for (const svc of services) {
    doc.text(svc.serviceName, 22, y);
    doc.text(String(svc.quantity), 115, y);
    doc.text(`€${svc.totalPrice.toFixed(2)}`, w - 22, y, { align: "right" });
    y += 7;
  }

  // Totals
  y += 6;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text("Total:", 20, y);
  doc.text(`€${split.totalServiceFee.toFixed(2)}`, w - 22, y, { align: "right" });
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(60);

  const depositPaid = candidate.paymentStatus === "deposit-paid" || candidate.paymentStatus === "fully-paid";
  const fullyPaid = candidate.paymentStatus === "fully-paid";
  const balanceDue = fullyPaid ? 0 : split.totalServiceFee - (depositPaid ? split.depositAmount : 0);

  doc.text(`Deposit Paid:`, 20, y);
  doc.text(`€${depositPaid ? split.depositAmount.toFixed(2) : "0.00"}`, w - 22, y, { align: "right" });
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(balanceDue > 0 ? 180 : 60, balanceDue > 0 ? 0 : 120, 0);
  doc.text(`Balance Due:`, 20, y);
  doc.text(`€${balanceDue.toFixed(2)}`, w - 22, y, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Payment terms: 30 days from invoice date.", 20, 280);

  return new Uint8Array(doc.output("arraybuffer"));
}
