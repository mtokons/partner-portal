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
  const colorRose = [225, 29, 72];    // Rose 600

  // ── Background Wave Patterns (Enhanced Geometry) ──
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(0.1);
  for (let i = 0; i < 20; i++) {
    const opacity = 0.08 - (i * 0.003);
    doc.setGState(new (doc as any).GState({ opacity }));
    // Large swooshing ellipses to simulate the background pattern
    doc.ellipse(width + 40, 20, 150 + (i * 35), 200 + (i * 25), "S");
    doc.ellipse(-40, height - 20, 150 + (i * 35), 200 + (i * 25), "S");
  }
  doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

  // ── Double Borders ──
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(1.2);
  doc.rect(12, 12, width - 24, height - 24, "S");
  
  doc.setLineWidth(0.4);
  doc.rect(10, 10, width - 20, height - 20, "S");

  // ── Header Text ──
  doc.setTextColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  const title = "TEILNAHMEBESCHEINIGUNG";
  doc.text(title, width / 2, 65, { align: "center", charSpace: 1 });

  // ── Student Name ──
  doc.setTextColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.text(cert.studentName, width / 2, 125, { align: "center" });

  // ── Main Content ──
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("nimmt hiermit aktiv an folgendem Sprachkurs teil:", width / 2, 155, { align: "center" });

  // ── Course Name (Highlighted) ──
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(cert.courseName, width / 2, 180, { align: "center", maxWidth: 160 });
  
  if (cert.courseLevel) {
    doc.setFontSize(14);
    doc.text(`Niveau ${cert.courseLevel}`, width / 2, 195, { align: "center" });
  }

  // ── Status Line ──
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  doc.text("Status: Der Kurs ist derzeit fortlaufend.", 35, 230, { align: "left" });

  // ── Footer ──
  
  // Left: SCCG Branding
  // Recreating the logo look with high-fidelity text
  doc.setTextColor(colorRose[0], colorRose[1], colorRose[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("SCCG", 35, 265);
  
  doc.setTextColor(colorSlate[0], colorSlate[1], colorSlate[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Connecting Talents Empowering Career", 35, 272);
  
  doc.setFontSize(10);
  doc.setTextColor(colorSlate[0], colorSlate[1], colorSlate[2]);
  const issueDateFormatted = new Date(cert.issuedDate).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  doc.text(`Issue Date: ${issueDateFormatted}`, 35, 285);

  // Center: Signature & Coordinator
  try {
    // Adding the signature image we deployed
    const sigImg = "/images/signature.png";
    doc.addImage(sigImg, "PNG", width / 2 - 25, 245, 50, 20);
  } catch (err) {
    console.error("Signature load failed", err);
  }

  doc.setDrawColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setLineWidth(0.3);
  doc.line(width / 2 - 25, 268, width / 2 + 25, 268);
  
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Kurskoordinator", width / 2, 274, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("SCCG Career Lab UG (haftungsbeschränkt)", width / 2, 280, { align: "center" });

  // Right: QR Code Placeholder & Verification Info
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(width - 65, 245, 30, 30, "S"); // Placeholder for QR
  
  // Minimal text inside placeholder if QR fails
  doc.setFontSize(6);
  doc.text("SECURE QR CODE", width - 50, 260, { align: "center" });

  doc.setTextColor(colorSlate[0], colorSlate[1], colorSlate[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Verify Certificate", width - 35, 274, { align: "right" });
  
  doc.setFontSize(9);
  doc.text(`ID: ${cert.certificateNumber}`, width - 35, 285, { align: "right" });

  // ── Output ──
  const safeName = cert.studentName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`SCCG_Certificate_${safeName}.pdf`);
}
