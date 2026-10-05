"use client";

import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { SchoolCertificate, SchoolBatch } from "@/types";

interface PrintableCertificateProps {
  certificate: SchoolCertificate;
  batch?: SchoolBatch;
}

export default function PrintableCertificate({ certificate, batch }: PrintableCertificateProps) {
  const isParticipation = certificate.certificateType === "participation";
  const verifyUrl = `https://portal.mysccg.de/verify/${certificate.verificationCode}`;

  // Format dates in German
  const issuedDateStr = new Date(certificate.issuedDate || new Date()).toLocaleDateString("de-DE", {
    day: "numeric", month: "long", year: "numeric"
  });

  let timelineStr = certificate.courseTimeline || "";
  if (!timelineStr && batch?.startDate && batch?.endDate) {
    const start = new Date(batch.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const end = new Date(batch.endDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    timelineStr = `${start} — ${end}`;
  }

  return (
    <div
      style={{
        width: "794px",   /* A4 portrait at 96dpi */
        height: "1123px", /* A4 portrait at 96dpi */
        padding: "0",
        margin: "0",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: "#1a1a2e",
      }}
    >
      {/* Outer border frame */}
      <div style={{
        position: "absolute",
        inset: "20px",
        border: "3px solid #0F4C81",
        pointerEvents: "none",
      }} />
      {/* Inner gold border */}
      <div style={{
        position: "absolute",
        inset: "28px",
        border: "1px solid #F5B800",
        pointerEvents: "none",
      }} />

      {/* Corner decorations */}
      {[
        { top: "20px", left: "20px" },
        { top: "20px", right: "20px" },
        { bottom: "20px", left: "20px" },
        { bottom: "20px", right: "20px" },
      ].map((pos, i) => (
        <div key={i} style={{
          position: "absolute",
          ...pos,
          width: "40px",
          height: "40px",
          borderTop: pos.top ? "4px solid #F5B800" : undefined,
          borderBottom: pos.bottom ? "4px solid #F5B800" : undefined,
          borderLeft: pos.left ? "4px solid #F5B800" : undefined,
          borderRight: pos.right ? "4px solid #F5B800" : undefined,
        }} />
      ))}

      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100%",
        padding: "50px 60px 40px",
        boxSizing: "border-box",
        textAlign: "center",
      }}>

        {/* Logo */}
        <img
          src="/assets/sccg-logo.png"
          alt="SCCG Logo"
          style={{ width: "180px", height: "auto", marginBottom: "12px" }}
          crossOrigin="anonymous"
        />

        {/* Organisation */}
        <p style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#0F4C81",
          letterSpacing: "3px",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}>
          SCCG career lab UG, Deutscheland
        </p>
        <p style={{
          fontSize: "11px",
          color: "#666",
          letterSpacing: "3px",
          textTransform: "uppercase",
          marginBottom: "30px",
        }}>
          Sprachschule
        </p>

        {/* Horizontal divider */}
        <div style={{
          width: "80px",
          height: "2px",
          background: "#F5B800",
          marginBottom: "30px",
        }} />

        {/* Certificate Title */}
        <h1 style={{
          fontSize: "42px",
          fontWeight: 700,
          color: "#0F4C81",
          letterSpacing: "2px",
          marginBottom: "8px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>
          Zertifikat
        </h1>
        <p style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "#F5B800",
          letterSpacing: "4px",
          textTransform: "uppercase",
          marginBottom: "45px",
        }}>
          {isParticipation ? "Teilnahmebescheinigung" : "Leistungszertifikat"}
        </p>

        {/* Body text */}
        <p style={{ fontSize: "13px", color: "#555", marginBottom: "14px" }}>
          Hiermit wird bestätigt, dass
        </p>

        {/* Student Name */}
        <h2 style={{
          fontSize: "36px",
          fontWeight: 900,
          color: "#1a1a2e",
          fontStyle: "italic",
          marginBottom: "20px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>
          {certificate.studentName}
        </h2>

        {/* Course description */}
        <p style={{
          fontSize: "14px",
          color: "#444",
          lineHeight: "1.8",
          maxWidth: "520px",
          marginBottom: "10px",
        }}>
          {isParticipation
            ? "an dem Deutschkurs"
            : "den Deutschkurs"
          }
        </p>
        <p style={{
          fontSize: "20px",
          fontWeight: 800,
          color: "#1a1a2e",
          marginBottom: "8px",
        }}>
          {certificate.courseName}
        </p>
        <p style={{
          fontSize: "14px",
          color: "#444",
          lineHeight: "1.8",
          maxWidth: "520px",
          marginBottom: "6px",
        }}>
          auf dem GER-Niveau{" "}
          <span style={{ fontWeight: 800, color: "#0F4C81", fontSize: "16px" }}>
            {certificate.courseLevel || "A1"}
          </span>
          {" "}
          {isParticipation ? "teilgenommen hat." : "erfolgreich abgeschlossen hat."}
        </p>

        {/* Timeline */}
        {timelineStr && (
          <p style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#888",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginTop: "8px",
            marginBottom: "30px",
          }}>
            Zeitraum: {timelineStr}
          </p>
        )}
        {!timelineStr && <div style={{ height: "30px" }} />}

        {/* Grades (only for completion) */}
        {!isParticipation && (
          <div style={{
            display: "flex",
            gap: "50px",
            borderTop: "1px solid #e0e0e0",
            borderBottom: "1px solid #e0e0e0",
            padding: "16px 40px",
            marginBottom: "30px",
          }}>
            <div>
              <p style={{ fontSize: "9px", color: "#999", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
                Abschlussnote
              </p>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>
                {certificate.finalGrade || "Sehr Gut"}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "9px", color: "#999", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
                Prüfungsergebnis
              </p>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>
                {certificate.examScore || 95}%
              </p>
            </div>
          </div>
        )}

        {/* Spacer pushes footer to bottom */}
        <div style={{ flex: 1 }} />

        {/* Footer: QR + verification info */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}>
          {/* QR Code - bigger */}
          <div style={{
            background: "#fff",
            padding: "8px",
            border: "2px solid #e0e0e0",
            borderRadius: "10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <QRCodeCanvas value={verifyUrl} size={115} level="M" />
          </div>

          <p style={{
            fontSize: "10px",
            color: "#888",
            textAlign: "center",
            lineHeight: "1.6",
            maxWidth: "400px",
          }}>
            Dieses Zertifikat wurde systemseitig erstellt und ist digital verifizierbar.<br />
            Scannen Sie den QR-Code oder besuchen Sie:
          </p>
          <p style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#0F4C81",
            fontFamily: "monospace",
          }}>
            portal.mysccg.de/verify/{certificate.verificationCode}
          </p>
        </div>

        {/* Bottom info line */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          borderTop: "1px solid #e0e0e0",
          paddingTop: "12px",
          marginTop: "4px",
        }}>
          <p style={{ fontSize: "9px", color: "#aaa" }}>
            Ausstellungsdatum: {issuedDateStr}
          </p>
          <p style={{ fontSize: "9px", color: "#aaa", fontFamily: "monospace", fontWeight: 700 }}>
            Nr. {certificate.certificateNumber || certificate.sccgId || "SCCG-CERT"}
          </p>
        </div>
      </div>
    </div>
  );
}
