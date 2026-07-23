import jsPDF from "jspdf";
import type { Candidate, CandidateService } from "@/types";
import type { FinancialSplitResult } from "@/lib/engine/financial-split";

// ── Color Constants ─────────────────────────────────────────
const BRAND_BLUE = [30, 64, 175] as const;
const BRAND_DARK = [15, 23, 42] as const;
const TEXT_GRAY = [71, 85, 105] as const;
const TEXT_LIGHT = [148, 163, 184] as const;

// ── Helper: Safe Date Formatter ──────────────────────────────
function formatDateSafe(val?: string | null): string {
  if (!val || typeof val !== "string" || !val.trim()) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("de-DE");
  } catch {
    return val;
  }
}

// ── Helper: auto-paginate ──────────────────────────────────
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 25) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ── Header ─────────────────────────────────────────────────
function renderHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string
): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  doc.rect(0, 0, w, 28, "F");
  doc.setFillColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
  doc.rect(0, 0, w, 4, "F");

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 18);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, w - 20, 18, { align: "right" });
  }

  return 40;
}

// ── Section Title ──────────────────────────────────────────
function renderSectionTitle(doc: jsPDF, y: number, title: string): number {
  y = ensureSpace(doc, y, 15);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  doc.text(title, 20, y);
  y += 2;
  doc.setDrawColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  doc.setLineWidth(0.5);
  doc.line(20, y, 80, y);
  return y + 8;
}

// ── Key-Value Pair ─────────────────────────────────────────
function renderField(
  doc: jsPDF,
  y: number,
  label: string,
  value?: string | number | null,
  x = 20,
  labelWidth = 50
): number {
  const safeVal = String(value ?? "—");
  y = ensureSpace(doc, y, 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
  doc.text(label + ":", x, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(safeVal, x + labelWidth, y);
  return y + 6;
}

// ── Services Table ─────────────────────────────────────────
function renderServicesTable(
  doc: jsPDF,
  y: number,
  services: CandidateService[]
): number {
  const w = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 20);

  doc.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  doc.rect(20, y, w - 40, 8, "F");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Service", 22, y + 5.5);
  doc.text("Type", 100, y + 5.5);
  doc.text("Qty", 140, y + 5.5);
  doc.text("Total (€)", w - 22, y + 5.5, { align: "right" });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  for (let i = 0; i < services.length; i++) {
    y = ensureSpace(doc, y, 8);
    const svc = services[i];

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, y - 4, w - 40, 8, "F");
    }

    doc.setTextColor(0, 0, 0);
    doc.text(svc.serviceName || "Service", 22, y);
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.text((svc.packageType || "").replace(/-/g, " "), 100, y);
    doc.text(String(svc.quantity || 1), 140, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`€${(svc.totalPrice || 0).toFixed(2)}`, w - 22, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 8;
  }

  return y;
}

// ── Financial Summary ──────────────────────────────────────
function renderFinancialSummary(
  doc: jsPDF,
  y: number,
  split: FinancialSplitResult,
  candidate: Candidate
): number {
  const w = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 40);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, w - 20, y);
  y += 8;

  const renderLine = (label: string, value: string, bold = false, color?: readonly number[]) => {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(bold ? 10 : 9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.text(label, 20, y);
    if (color) doc.setTextColor(color[0], color[1], color[2]);
    else doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(value, w - 22, y, { align: "right" });
    y += 7;
  };

  renderLine("Total Service Fee:", `€${(split.totalServiceFee || 0).toFixed(2)}`, true, BRAND_BLUE);
  renderLine(`Partner Share (${candidate.marginPercentage || 0}%):`, `€${(split.partnerShare || 0).toFixed(2)}`);
  renderLine("SCCG Share:", `€${(split.sccgShare || 0).toFixed(2)}`);
  renderLine("Required Deposit (30%):", `€${(split.depositAmount || 0).toFixed(2)}`);

  return y;
}

// ── Footer ─────────────────────────────────────────────────
function renderFooter(doc: jsPDF, pageNum?: number): void {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(200, 200, 200);
  doc.line(20, h - 18, w - 20, h - 18);

  doc.setFontSize(7);
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.setFont("helvetica", "normal");
  doc.text("SCCG Career Lab UG (haftungsbeschränkt) — Proud to partner for global opportunities.", 20, h - 12);

  if (pageNum !== undefined) {
    doc.text(`Page ${pageNum}`, w - 20, h - 12, { align: "right" });
  }
  doc.text(`Generated: ${formatDateSafe(new Date().toISOString())}`, w - 20, h - 8, { align: "right" });
}

// ══════════════════════════════════════════════════════════════
// PUBLIC: Generate Candidate CV PDF
// ══════════════════════════════════════════════════════════════
export function generateCandidateCvPdf(
  candidate: Candidate,
  services: CandidateService[]
): Uint8Array {
  const doc = new jsPDF();

  let y = renderHeader(doc, "CANDIDATE PROFILE", `SCCG ID: ${candidate.sccgId || "—"}`);

  // Personal Info
  y = renderSectionTitle(doc, y, "Personal Information");
  y = renderField(doc, y, "Full Name", candidate.fullName);
  y = renderField(doc, y, "Email", candidate.email);
  y = renderField(doc, y, "Phone", candidate.phone);
  y = renderField(doc, y, "Nationality", candidate.nationality);
  y = renderField(doc, y, "Country", candidate.country);
  if (candidate.dateOfBirth) {
    y = renderField(doc, y, "Date of Birth", formatDateSafe(candidate.dateOfBirth));
  }
  if (candidate.passportNumber) {
    y = renderField(doc, y, "Passport #", candidate.passportNumber);
  }
  if (candidate.address) {
    y = renderField(doc, y, "Address", candidate.address);
  }

  // Workflow
  y += 4;
  y = renderSectionTitle(doc, y, "Program Details");
  y = renderField(doc, y, "Category", candidate.workflowCategory);
  y = renderField(
    doc,
    y,
    "Current Status",
    (candidate.currentStatus as string || "")
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  );
  y = renderField(doc, y, "Partner", candidate.partnerName ?? candidate.partnerId);

  // Services
  if (services && services.length > 0) {
    y += 4;
    y = renderSectionTitle(doc, y, "Enrolled Services");
    y = renderServicesTable(doc, y, services);
  }

  renderFooter(doc, 1);
  return new Uint8Array(doc.output("arraybuffer"));
}

// ══════════════════════════════════════════════════════════════
// PUBLIC: Generate Full Dossier PDF
// ══════════════════════════════════════════════════════════════
export function generateCandidateDossierPdf(
  candidate: Candidate,
  services: CandidateService[],
  split: FinancialSplitResult
): Uint8Array {
  const doc = new jsPDF();

  let y = renderHeader(doc, "CANDIDATE DOSSIER", `SCCG ID: ${candidate.sccgId || "—"}`);

  // Personal Info
  y = renderSectionTitle(doc, y, "Personal Information");
  y = renderField(doc, y, "Full Name", candidate.fullName);
  y = renderField(doc, y, "Email", candidate.email);
  y = renderField(doc, y, "Phone", candidate.phone);
  y = renderField(doc, y, "Nationality", candidate.nationality);
  y = renderField(doc, y, "Country", candidate.country);
  if (candidate.dateOfBirth) y = renderField(doc, y, "Date of Birth", formatDateSafe(candidate.dateOfBirth));
  if (candidate.passportNumber) y = renderField(doc, y, "Passport #", candidate.passportNumber);
  if (candidate.nationalId) y = renderField(doc, y, "National ID", candidate.nationalId);
  if (candidate.address) y = renderField(doc, y, "Address", candidate.address);

  // Program
  y += 4;
  y = renderSectionTitle(doc, y, "Program Details");
  y = renderField(doc, y, "Category", candidate.workflowCategory);
  y = renderField(doc, y, "Current Status", (candidate.currentStatus as string || "").split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" "));
  y = renderField(doc, y, "Payment Status", (candidate.paymentStatus || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  y = renderField(doc, y, "Partner", candidate.partnerName ?? candidate.partnerId);
  if (candidate.isOnHold) y = renderField(doc, y, "On Hold", "YES");

  // Services
  if (services && services.length > 0) {
    y += 4;
    y = renderSectionTitle(doc, y, "Enrolled Services");
    y = renderServicesTable(doc, y, services);
  }

  // Financial
  y += 4;
  y = renderSectionTitle(doc, y, "Financial Summary");
  y = renderFinancialSummary(doc, y, split, candidate);

  // Notes
  if (candidate.notes) {
    y += 4;
    y = renderSectionTitle(doc, y, "Notes");
    y = ensureSpace(doc, y, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(candidate.notes, 165);
    doc.text(lines, 20, y);
    y += lines.length * 5;
  }

  renderFooter(doc, 1);
  return new Uint8Array(doc.output("arraybuffer"));
}

// ══════════════════════════════════════════════════════════════
// PUBLIC: Generate Merged PDF (multiple candidates)
// ══════════════════════════════════════════════════════════════
export function generateMergedCandidatesPdf(
  candidatesData: Array<{
    candidate: Candidate;
    services: CandidateService[];
    split: FinancialSplitResult;
  }>,
  contentType: "cv" | "dossier"
): Uint8Array {
  if (candidatesData.length === 0) {
    const doc = new jsPDF();
    doc.text("No candidates to export.", 20, 30);
    return new Uint8Array(doc.output("arraybuffer"));
  }

  const first = candidatesData[0];
  const firstBytes =
    contentType === "dossier"
      ? generateCandidateDossierPdf(first.candidate, first.services, first.split)
      : generateCandidateCvPdf(first.candidate, first.services);

  if (candidatesData.length === 1) return firstBytes;

  const doc = new jsPDF();
  let pageNum = 0;

  for (let i = 0; i < candidatesData.length; i++) {
    if (i > 0) doc.addPage();
    pageNum++;

    const { candidate, services, split } = candidatesData[i];
    let y: number;

    if (contentType === "dossier") {
      y = renderHeader(doc, "CANDIDATE DOSSIER", `${i + 1}/${candidatesData.length} — ${candidate.sccgId || "—"}`);
    } else {
      y = renderHeader(doc, "CANDIDATE PROFILE", `${i + 1}/${candidatesData.length} — ${candidate.sccgId || "—"}`);
    }

    y = renderSectionTitle(doc, y, "Personal Information");
    y = renderField(doc, y, "Full Name", candidate.fullName);
    y = renderField(doc, y, "Email", candidate.email);
    y = renderField(doc, y, "Phone", candidate.phone);
    y = renderField(doc, y, "Nationality", candidate.nationality);
    y = renderField(doc, y, "Country", candidate.country);

    y += 4;
    y = renderSectionTitle(doc, y, "Program");
    y = renderField(doc, y, "Category", candidate.workflowCategory);
    y = renderField(doc, y, "Status", (candidate.currentStatus as string || "").split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" "));

    if (services && services.length > 0) {
      y += 4;
      y = renderSectionTitle(doc, y, "Services");
      y = renderServicesTable(doc, y, services);
    }

    if (contentType === "dossier") {
      y += 4;
      y = renderSectionTitle(doc, y, "Financial");
      y = renderFinancialSummary(doc, y, split, candidate);
    }

    renderFooter(doc, pageNum);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
