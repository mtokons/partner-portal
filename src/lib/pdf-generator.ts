"use client";

import { jsPDF } from "jspdf";
import type { SchoolCertificate } from "@/types";

/**
 * Load an image from a URL and return it as a base64 data URL.
 */
async function loadImageAsDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate a QR code as a PNG data URL using qrcode.react's SVG output
 * rendered to a canvas.
 */
async function generateQRDataUrl(text: string, size: number): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { QRCodeSVG } = await import("qrcode.react");

  const svgString = renderToStaticMarkup(
    createElement(QRCodeSVG, { value: text, size, level: "H" })
  );

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  });
}

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

  // ── Background Wave Patterns (Enhanced Geometry) ──
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(0.1);
  for (let i = 0; i < 20; i++) {
    const opacity = 0.08 - (i * 0.003);
    doc.setGState(new (doc as any).GState({ opacity }));
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
  doc.text("Status: Der Kurs ist derzeit fortlaufend.", 35, 220, { align: "left" });

  // ── Footer ──
  
  // Left: SCCG Logo (actual image)
  try {
    const logoDataUrl = await loadImageAsDataUrl("/images/sccg-logo.png");
    doc.addImage(logoDataUrl, "PNG", 25, 225, 30, 30);
  } catch (err) {
    console.error("Logo load failed", err);
  }

  doc.setFontSize(10);
  doc.setTextColor(colorSlate[0], colorSlate[1], colorSlate[2]);
  const issueDateFormatted = new Date(cert.issuedDate).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  doc.text(`Issue Date: ${issueDateFormatted}`, 25, 260);

  // Center: Signature & Coordinator
  try {
    const sigDataUrl = await loadImageAsDataUrl("/images/signature.png");
    doc.addImage(sigDataUrl, "PNG", width / 2 - 25, 230, 50, 20);
  } catch (err) {
    console.error("Signature load failed", err);
  }

  doc.setDrawColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setLineWidth(0.3);
  doc.line(width / 2 - 25, 253, width / 2 + 25, 253);
  
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Kurskoordinator", width / 2, 258, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("SCCG Career Lab UG (haftungsbeschränkt)", width / 2, 263, { align: "center" });

  // Right: Issue date & Certificate ID
  doc.setTextColor(colorSlate[0], colorSlate[1], colorSlate[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`ID: ${cert.certificateNumber}`, width - 25, 260, { align: "right" });

  // ── QR Code — positioned top-left inside inner margin ──
  const verificationUrl = `https://portal.mysccg.de/verify/${cert.verificationCode || cert.certificateNumber}`;
  try {
    const qrDataUrl = await generateQRDataUrl(verificationUrl, 400);
    if (qrDataUrl) {
      const qrSize = 32; // mm
      const innerPadding = 6; // mm from inner border
      const qrX = width - 12 - qrSize - innerPadding; // top-right corner
      const qrY = 12 + innerPadding;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      doc.setTextColor(colorPurple[0], colorPurple[1], colorPurple[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Scan to Verify", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });
    }
  } catch (err) {
    console.error("QR generation failed", err);
  }

  // ── Output ──
  const safeName = cert.studentName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const fileName = `SCCG_Certificate_${safeName}.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
