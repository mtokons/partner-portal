import jsPDF from "jspdf";
import type { DailyReportSummary } from "./availability";
import { STATUS_LABELS } from "./availability-config";

export function generateDailyReportPdf(report: DailyReportSummary): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Daily availability report", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Date: ${report.date} | Sent 8:30 AM to management (Asia/Dhaka)`, 14, 18);
  doc.text("SCCG Career Lab UG", pageWidth - 14, 15, { align: "right" });

  y = 34;

  // Summary Metrics Tiles
  const tileWidth = 33;
  const tileHeight = 22;
  const tileGap = 4;
  const startX = 14;

  const metrics = [
    { label: "Available", count: report.availableCount, color: [22, 163, 74] }, // green-600
    { label: "Partial", count: report.partialCount, color: [217, 119, 6] },   // amber-600
    { label: "On leave", count: report.leaveCount, color: [225, 29, 72] },    // rose-600
    { label: "Remote/field", count: report.remoteFieldCount, color: [37, 99, 235] }, // blue-600
    { label: "Not submitted", count: report.notSubmittedCount, color: [100, 116, 139] }, // slate-500
  ];

  metrics.forEach((m, idx) => {
    const x = startX + idx * (tileWidth + tileGap);
    // Background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, tileWidth, tileHeight, 2, 2, "FD");

    // Metric Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 4, y + 7);

    // Metric Count
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(String(m.count), x + 4, y + 17);
  });

  y += tileHeight + 12;

  // Section 1: Not fully available today
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Not fully available today (${report.notFullyAvailableList.length})`, 14, y);

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  if (report.notFullyAvailableList.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("All active staff members are fully available today.", 14, y);
    y += 10;
  } else {
    report.notFullyAvailableList.forEach((item) => {
      // Check for page overflow
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.userName, 14, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const subInfo = [item.department, item.note].filter(Boolean).join(" — ");
      doc.text(subInfo || "No details", 14, y + 4.5);

      // Status pill on the right
      const statusLabel = item.timeRange || STATUS_LABELS[item.status] || item.status;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);

      if (item.status === "partial") {
        doc.setFillColor(254, 243, 199); // amber-100
        doc.setTextColor(180, 83, 9);    // amber-700
      } else if (item.status === "leave") {
        doc.setFillColor(255, 228, 230); // rose-100
        doc.setTextColor(190, 18, 60);   // rose-700
      } else {
        doc.setFillColor(224, 242, 254); // sky-100
        doc.setTextColor(3, 105, 161);   // sky-700
      }

      const pillWidth = Math.max(30, doc.getTextWidth(statusLabel) + 6);
      doc.roundedRect(pageWidth - 14 - pillWidth, y - 3.5, pillWidth, 6.5, 1.5, 1.5, "F");
      doc.text(statusLabel, pageWidth - 14 - pillWidth / 2, y + 0.8, { align: "center" });

      y += 12;
    });
  }

  y += 4;

  // Section 2: Not submitted yet
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Not submitted yet (${report.notSubmittedList.length})`, 14, y);

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  if (report.notSubmittedList.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("All active staff members have submitted entries for today.", 14, y);
    y += 10;
  } else {
    report.notSubmittedList.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.userName, 14, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(item.department || "General", 14, y + 4.5);

      // Dashed style "No entry" box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(pageWidth - 36, y - 3.5, 22, 6.5, 1.5, 1.5, "FD");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("No entry", pageWidth - 25, y + 0.8, { align: "center" });

      y += 11;
    });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
