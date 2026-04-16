"use client";

import { jsPDF } from "jspdf";
import type { SchoolCertificate } from "@/types";

/**
 * Generates a high-fidelity PDF certificate (Teilnahmebescheinigung)
 * matching the user's provided layout.
 */
export async function generateCertificatePDF(cert: SchoolCertificate) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth(); // 210mm
  const height = doc.internal.pageSize.getHeight(); // 297mm

  // ── Colors ──
  const colorPurple = [134, 49, 134]; // Fuchsia 900 approx #863186
  const colorSlate = [71, 85, 105];   // Slate 600
  const colorBlack = [0, 0, 0];

  // ── Background Wave Patterns (Simulated) ──
  // We draw some subtle lines to simulate the wave pattern if we can't use an image
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(0.1);
  for (let i = 0; i < 15; i++) {
    doc.setGState(new (doc as any).GState({ opacity: 0.1 - (i * 0.005) }));
    doc.ellipse(width + 20, -20, 100 + (i * 40), 100 + (i * 40), "S");
  }
  doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

  // ── Borders ──
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(1.5);
  doc.rect(15, 15, width - 30, height - 30, "S");
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.rect(13, 13, width - 26, height - 26, "S");

  // ── Header Text ──
  doc.setTextColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  const title = "TEILNAHMEBESCHEINIGUNG";
  doc.text(title, width / 2, 60, { align: "center" });

  // ── Student Name ──
  doc.setFontSize(36);
  doc.text(cert.studentName, width / 2, 120, { align: "center" });

  // ── Subtitle ──
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("nimmt hiermit aktiv an folgendem Sprachkurs teil:", width / 2, 150, { align: "center" });

  // ── Course Name ──
  doc.setFontSize(18);
  doc.text(cert.courseName, width / 2, 175, { align: "center", maxWidth: 160 });

  // ── Status ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  doc.text("Status: Der Kurs ist derzeit fortlaufend.", 40, 220, { align: "left" });

  // ── Footer ──
  
  // Left side: SCCG Logo (Placeholder text for now)
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("SCCG", 30, 260);
  
  doc.setTextColor(colorSlate[0], colorSlate[1], colorSlate[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Connecting Talents Empowering Career", 30, 265);
  
  const issueDate = `Issue Date: ${new Date(cert.issuedDate).toLocaleDateString("de-DE")}`;
  doc.text(issueDate, 30, 285);

  // Middle: Signature Image
  try {
    // We add the signature image from public/images/signature.png
    // jsPDF in browser can often handle paths if they are in the public folder
    doc.addImage("/images/signature.png", "PNG", width / 2 - 20, 245, 40, 15);
  } catch (err) {
    // Fallback if image fails to load
    doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(24);
    doc.text("Nokan", width / 2, 260, { align: "center" });
  }

  doc.setDrawColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setLineWidth(0.2);
  doc.line(width / 2 - 20, 262, width / 2 + 20, 262); // underline
  
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Kurskoordinator", width / 2, 267, { align: "center" });
  doc.text("SCCG Career Lab UG", width / 2, 272, { align: "center" });
  doc.text("(haftungsbeschränkt)", width / 2, 277, { align: "center" });

  // Right side: QR Code
  // Note: For QR code, we would normally use a canvas to dataURL.
  // We'll leave space for it or draw a placeholder square
  doc.setDrawColor(200, 200, 200);
  doc.rect(width - 55, 245, 25, 25, "S");
  doc.setFontSize(7);
  doc.text("Verify Certificate", width - 42.5, 273, { align: "center" });

  doc.setTextColor(colorSlate[0], colorSlate[1], colorSlate[2]);
  doc.setFontSize(8);
  doc.text(`Certificate: ${cert.certificateNumber}`, width - 30, 285, { align: "right" });

  // ── Save or Download ──
  const filename = `Certificate_${cert.studentName.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
