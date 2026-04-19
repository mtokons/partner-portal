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
  const colorPurple = [155, 89, 182]; // #9b59b6
  const colorSlate = [71, 85, 105];   // Slate 600
  const colorBlack = [17, 17, 17];
  const colorRed = [224, 48, 48];     // #e03030

  // ── Watermark lines (Diagonal) ──
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
  doc.setLineWidth(0.1);
  for (let i = -height; i < width + height; i += 8) {
    doc.line(i, 0, i + height, height);
  }
  doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

  // ── Double Borders ──
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, width - 20, height - 20, "S");
  
  doc.setDrawColor(212, 168, 232); // #d4a8e8
  doc.setLineWidth(0.3);
  doc.rect(12, 12, width - 24, height - 24, "S");

  // ── Header Title ──
  doc.setTextColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  const title = cert.certificateType === "completion" ? "ABSCHLUSSZERTIFIKAT" : "TEILNAHMEBESCHEINIGUNG";
  doc.text(title, width / 2, 45, { align: "center" });

  doc.setTextColor(187, 187, 187);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SCCG Career Lab UG — Connecting Talents, Empowering Career", width / 2, 52, { align: "center" });

  // ── Divider ──
  doc.setDrawColor(232, 213, 245);
  doc.setLineWidth(0.4);
  doc.line(30, 60, width - 30, 60);

  // ── Student Name ──
  doc.setTextColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setFontSize(38);
  doc.setFont("helvetica", "bold");
  doc.text(cert.studentName, width / 2, 90, { align: "center" });

  const nameWidth = doc.getTextWidth(cert.studentName);
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(0.5);
  doc.line(width / 2 - nameWidth / 2, 92, width / 2 + nameWidth / 2, 92);

  // ── Body Text ──
  doc.setTextColor(68, 68, 68);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const certTypePhrase = cert.certificateType === "completion"
    ? "hat erfolgreich den folgenden Sprachkurs abgeschlossen:"
    : "nimmt hiermit aktiv an folgendem Sprachkurs teil:";
  doc.text(certTypePhrase, width / 2, 110, { align: "center" });

  // ── Course Highlight ──
  doc.setFillColor(248, 240, 255);
  doc.setDrawColor(212, 168, 232);
  doc.roundedRect(30, 120, width - 60, 20, 3, 3, "FD");

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const levelSub = cert.courseLevel ? ` (${cert.courseLevel})` : "";
  doc.text(`Deutsch als Fremdsprache: Niveau ${cert.courseLevel}${levelSub}`, width / 2, 132, { align: "center" });

  // ── Status ──
  doc.setTextColor(136, 136, 136);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  let statusText = cert.certificateType === "participation" 
    ? "Status: Der Kurs ist derzeit fortlaufend."
    : `Status: Erfolgreich abgeschlossen${cert.endDate ? " am " + cert.endDate : ""}.`;
  doc.text(statusText, 30, 160);

  // ── QR Code (Top Right) ──
  const verificationUrl = `https://portal.mysccg.de/verify/${cert.verificationCode || cert.certificateNumber}`;
  try {
    const qrDataUrl = await generateQRDataUrl(verificationUrl, 300);
    if (qrDataUrl) {
      const qrSize = 34; // mm
      const qrX = width - qrSize - 20;
      const qrY = 25;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      doc.setTextColor(colorPurple[0], colorPurple[1], colorPurple[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Scan to Verify", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });
      
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(6);
      doc.text(verificationUrl.replace("https://", ""), qrX + qrSize / 2, qrY + qrSize + 8, { align: "center" });
    }
  } catch (err) {
    console.error("QR generation failed", err);
  }

  // ── Branding & Footer ──
  // Drawn Logo (Simplified)
  doc.setTextColor(colorRed[0], colorRed[1], colorRed[2]);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SCCG", 30, 210);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Connecting Talents Empowering Career", 30, 216);

  // Coordinator
  doc.setTextColor(102, 102, 102);
  doc.setFontSize(10);
  doc.text("Kurskoordinator", width - 70, 240);
  doc.text("SCCG Career Lab UG", width - 70, 245);
  doc.text("(haftungsbeschränkt)", width - 70, 250);

  // Bottom Line
  doc.setDrawColor(colorPurple[0], colorPurple[1], colorPurple[2]);
  doc.setLineWidth(0.2);
  doc.line(30, 270, width - 30, 270);

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Issue Date: ${cert.issuedDate}`, 30, 280);
  doc.text(`Certificate: ${cert.certificateNumber}`, width - 30, 280, { align: "right" });

  // ── Output ──
  const fileName = `SCCG_Certificate_${cert.studentName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
