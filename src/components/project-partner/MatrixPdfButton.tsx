"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { ProjectStaffingEntry } from "@/types";

interface Props {
  projectName: string;
  client: string;
  rows: ProjectStaffingEntry[];
}

const STATUS_LABEL: Record<string, string> = { active: "Active", standby: "Standby", unavailable: "Unavailable" };

export default function MatrixPdfButton({ projectName, client, rows }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const left = 14;
      doc.setFontSize(16);
      doc.text("Expert Staffing Matrix", left, 16);
      doc.setFontSize(10);
      doc.text(`${projectName} — ${client}`, left, 23);

      const cols = [16, 24, 36, 34, 30, 22, 44, 44, 36]; // mm widths (landscape A4)
      const headers = ["Status", "Work Package", "Focus & Objective", "Expert Position", "Name", "Edu.", "Prof. Experience", "Specific Prof. Exp.", "Dev. Cooperation"];
      let y = 32;
      doc.setFillColor(30, 64, 175);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      let x = left;
      doc.rect(left, y - 5, cols.reduce((a, b) => a + b, 0), 7, "F");
      headers.forEach((h, i) => { doc.text(h, x + 1, y); x += cols[i]; });
      y += 5;
      doc.setTextColor(0, 0, 0);
      rows.forEach((r) => {
        const cells = [STATUS_LABEL[r.activeStatus] || r.activeStatus, r.workPackage || "", r.focusObjective || "", r.position, r.expertId ? `${r.expertId} — ${r.expertName}` : r.expertName, r.education || "", r.profExperience || "", r.specificExperience || "", r.devCooperation || ""];
        const wrapped = cells.map((c, i) => doc.splitTextToSize(c, cols[i] - 2));
        const lines = Math.max(...wrapped.map((w) => w.length));
        if (y + lines * 4 > 200) { doc.addPage(); y = 16; }
        x = left;
        wrapped.forEach((w, i) => { doc.text(w, x + 1, y); x += cols[i]; });
        y += lines * 4 + 2;
        doc.setDrawColor(220);
        doc.line(left, y - 5, left + cols.reduce((a, b) => a + b, 0), y - 5);
      });
      doc.save(`Staffing-Matrix-${projectName.replace(/\s+/g, "-")}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={busy || rows.length === 0}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      <Download className="h-4 w-4" /> {busy ? "Generating…" : "Download PDF"}
    </button>
  );
}
