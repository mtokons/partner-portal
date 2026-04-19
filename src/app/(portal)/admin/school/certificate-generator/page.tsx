"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Award, Download, Share2, User, Mail, Calendar, 
  Layers, CheckCircle2, ShieldCheck, Loader2, ArrowRight, FileText,
  FileBadge, Info, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { registerManualCertificate } from "../actions";
import { toast } from "sonner";

const LEVEL_NAMES: Record<string, { label: string; sub: string }> = {
  A1: { label: "A1", sub: "Anfänger" },
  A2: { label: "A2", sub: "Grundstufe" },
  B1: { label: "B1", sub: "Mittelstufe" },
  B2: { label: "B2", sub: "Oberstufe" },
  C1: { label: "C1", sub: "Fortgeschritten" },
  C2: { label: "C2", sub: "Mastery" }
};

type CertType = "participation" | "completion";

interface CertData {
  name: string;
  email: string;
  type: CertType;
  level: string;
  issueDate: string;
  endDate: string;
  certId: string;
}

export default function CertificateGeneratorPage() {
  const [data, setData] = useState<CertData>({
    name: "",
    email: "",
    type: "participation",
    level: "A1",
    issueDate: new Date().toISOString().split("T")[0],
    endDate: "",
    certId: ""
  });

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Generate ID if empty
  const ensureCertId = useCallback(() => {
    if (!data.certId) {
      const prefix = "SCCG";
      const yr = new Date().getFullYear().toString().slice(2);
      const rand = Math.floor(Math.random() * 900 + 100);
      setData(prev => ({ ...prev, certId: `${prefix}${yr}${prev.level}${rand}` }));
    }
  }, [data.certId, data.level]);

  useEffect(() => {
    ensureCertId();
  }, [ensureCertId]);

  const drawCertificate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High resolution scaling (A4 ratio ~1.414)
    const W = 794 * 2;
    const H = 1123 * 2;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // ── Watermark lines (Diagonal) ──
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 2;
    for (let i = -H; i < W + H; i += 80) {
      ctx.beginPath(); 
      ctx.moveTo(i, 0); 
      ctx.lineTo(i + H, H); 
      ctx.stroke();
    }
    ctx.restore();

    // ── Double Border ──
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.strokeStyle = "#d4a8e8";
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    // ── Header Title ──
    const titleText = data.type === "participation" ? "TEILNAHMEBESCHEINIGUNG" : "ABSCHLUSSZERTIFIKAT";
    ctx.font = "bold 68px Georgia, serif";
    ctx.fillStyle = "#9b59b6";
    ctx.textAlign = "center";
    ctx.fillText(titleText, W / 2, 220);

    // Subtitle line
    ctx.font = "26px Georgia, serif";
    ctx.fillStyle = "#bbb";
    ctx.fillText("SCCG Career Lab UG — Connecting Talents, Empowering Career", W / 2, 264);

    // Divider
    ctx.strokeStyle = "#e8d5f5";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(160, 296); ctx.lineTo(W - 160, 296); ctx.stroke();

    // ── Body Text ──
    ctx.font = "italic 32px Georgia, serif";
    ctx.fillStyle = "#555";
    const certTypePhrase = data.type === "participation"
      ? "nimmt hiermit aktiv an folgendem Sprachkurs teil:"
      : "hat erfolgreich den folgenden Sprachkurs abgeschlossen:";
    
    // Student Name
    ctx.font = "bold 76px Georgia, serif";
    ctx.fillStyle = "#9b59b6";
    ctx.fillText(data.name || "[STUDENT NAME]", W / 2, 520);

    // Underline Name
    const nameW = ctx.measureText(data.name || "[STUDENT NAME]").width;
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameW / 2, 540); ctx.lineTo(W / 2 + nameW / 2, 540); ctx.stroke();

    // Phrase
    ctx.font = "32px Georgia, serif";
    ctx.fillStyle = "#444";
    ctx.fillText(certTypePhrase, W / 2, 620);

    // ── Course Name Box ──
    ctx.fillStyle = "#f8f0ff";
    ctx.strokeStyle = "#d4a8e8";
    ctx.lineWidth = 2;
    const boxY = 660, boxH = 112;
    roundRect(ctx, 160, boxY, W - 320, boxH, 12);
    ctx.fill(); ctx.stroke();

    ctx.font = "bold 36px Georgia, serif";
    ctx.fillStyle = "#333";
    ctx.fillText(`Deutsch als Fremdsprache: Niveau ${data.level} (${LEVEL_NAMES[data.level].sub})`, W / 2, boxY + boxH / 2 + 14);

    // Status
    let statusText = "";
    if (data.type === "participation") {
      statusText = "Status: Der Kurs ist derzeit fortlaufend.";
    } else {
      statusText = `Status: Erfolgreich abgeschlossen${data.endDate ? " am " + formatDate(data.endDate) : ""}.`;
    }
    ctx.font = "italic 26px Georgia, serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "left";
    ctx.fillText(statusText, 160, 840);

    // ── SCCG Logo (Drawn) ──
    drawSCCGLogo(ctx, 160, 940);

    // ── Signature area ──
    drawSignature(ctx, 660, 920);

    // ── QR Code & Verification (Top Right) ──
    const qrCanvas = qrWrapperRef.current?.querySelector("canvas");
    if (qrCanvas) {
      const qrSize = 180 * 2;
      const qrX = W - qrSize - 80; 
      const qrY = 100; 
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = "#9b59b6";
      ctx.textAlign = "center";
      ctx.fillText("Scan to Verify", qrX + qrSize / 2, qrY + qrSize + 36);

      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#bbb";
      const verifyUrl = `portal.mysccg.de/verify/${data.certId}`;
      ctx.fillText(verifyUrl, qrX + qrSize / 2, qrY + qrSize + 64);
    }

    // ── Bottom Info ──
    const bottomY = H - 200;
    ctx.strokeStyle = "#e8d5f5";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(160, bottomY); ctx.lineTo(W - 160, bottomY); ctx.stroke();

    ctx.font = "24px Arial, sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "left";
    ctx.fillText(`Issue Date: ${formatDate(data.issueDate)}`, 160, bottomY + 46);

    ctx.textAlign = "right";
    ctx.fillText(`Certificate-ID: ${data.certId}`, W - 160, bottomY + 46);
  };

  const drawSCCGLogo = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const scale = 1.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // Icon people
    ctx.fillStyle = "#f0c020";
    ctx.beginPath(); ctx.arc(20, 8, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#2a8a5a";
    ctx.beginPath(); ctx.arc(55, 5, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#e03030";
    ctx.beginPath(); ctx.arc(10, 40, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#2a8a5a";
    ctx.beginPath(); ctx.arc(50, 45, 5, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(20, 15); ctx.lineTo(55, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 15); ctx.lineTo(10, 33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(55, 10); ctx.lineTo(50, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 33); ctx.lineTo(50, 40); ctx.stroke();

    // SCCG text
    ctx.font = "bold 36px Arial, sans-serif";
    ctx.fillStyle = "#e03030";
    ctx.textAlign = "left";
    ctx.fillText("SCCG", 68, 42);

    ctx.font = "12px Arial, sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("Connecting Talents Empowering Career", 2, 70);
    ctx.restore();
  };

  const drawSignature = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    // Stylized H
    ctx.moveTo(0, 80); ctx.lineTo(0, 0);
    ctx.moveTo(0, 40); ctx.lineTo(32, 40);
    ctx.moveTo(32, 0); ctx.lineTo(32, 80);
    // t
    ctx.moveTo(48, 20); ctx.lineTo(48, 80);
    ctx.moveTo(36, 36); ctx.lineTo(60, 36);
    // o
    ctx.moveTo(76, 40); ctx.ellipse(76, 60, 16, 20, 0, -Math.PI/2, Math.PI*1.5);
    // k
    ctx.moveTo(100, 20); ctx.lineTo(100, 80);
    ctx.moveTo(100, 56); ctx.lineTo(124, 36);
    ctx.moveTo(100, 56); ctx.lineTo(124, 80);
    // a
    ctx.moveTo(150, 50); ctx.ellipse(140, 60, 14, 16, 0, -Math.PI*0.2, Math.PI*1.8);
    ctx.moveTo(154, 44); ctx.lineTo(154, 84);
    // l
    ctx.moveTo(168, 20); ctx.lineTo(168, 90); ctx.lineTo(176, 90);
    ctx.stroke();

    // Underline
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, 100); ctx.lineTo(190, 100); ctx.stroke();
    ctx.restore();

    // Coordinator text
    ctx.font = "22px Arial, sans-serif";
    ctx.fillStyle = "#666";
    ctx.textAlign = "left";
    ctx.fillText("Kurskoordinator", x, y + 140);
    ctx.fillText("SCCG Career Lab UG", x, y + 172);
    ctx.fillText("(haftungsbeschränkt)", x, y + 204);
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  useEffect(() => {
    if (isPreviewing && canvasRef.current) {
      drawCertificate();
    }
  }, [isPreviewing, data.name, data.type, data.level, data.issueDate, data.endDate, data.certId, qrCodeData]);

  const handlePreview = () => {
    if (!data.name) {
      toast.error("Please enter student name");
      return;
    }
    setIsLoading(true);
    setQrCodeData(`https://portal.mysccg.de/verify/${data.certId}`);
    setIsPreviewing(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const downloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

    const safeName = data.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const fileName = `SCCG_Certificate_${safeName}.pdf`;
    pdf.save(fileName);
    toast.success("Certificate downloaded!");
  };

  const handleIssueAndDownload = async () => {
    if (!data.name || !data.email) {
      toast.error("Please provide student name and email");
      return;
    }

    try {
      setIsRegistering(true);
      
      const cert = await registerManualCertificate({
        studentName: data.name,
        studentEmail: data.email,
        certificateType: data.type,
        courseLevel: data.level,
        issueDate: data.issueDate,
        endDate: data.endDate || undefined
      });

      const updatedCertId = cert.certificateNumber;
      const updatedQrUrl = `https://portal.mysccg.de/verify/${cert.verificationCode}`;
      
      setData(prev => ({ ...prev, certId: updatedCertId }));
      setQrCodeData(updatedQrUrl);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      await drawCertificate();
      downloadPDF();
      setIsRegistering(false);
      toast.success("Certificate issued and registered successfully!");

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to register certificate";
      toast.error(message);
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)] gap-0 lg:gap-0 fade-in bg-[#f0efe8] h-full">
      {/* Hidden QR Canvas for PDF rendering */}
      {qrCodeData && (
        <div ref={qrWrapperRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <QRCodeCanvas value={qrCodeData} size={400} level="H" />
        </div>
      )}

      {/* Form Panel */}
      <div className="w-full lg:w-[400px] bg-white border-r border-gray-200 overflow-y-auto px-6 py-8 shadow-xl z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-[#111] rounded-lg flex items-center justify-center">
            <Award className="h-6 w-6 text-[#e03030]" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-[#111]">SCCG <span className="text-[#e03030]">LANGUAGE SCHOOL</span></h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">Certificate Hub</p>
          </div>
        </div>

        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-3 w-3 text-[#e03030]" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#666]">Student Profile</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sadia Musarrat"
                  value={data.name}
                  onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-11 px-3 text-sm rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#e03030] focus:ring-4 focus:ring-red-500/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  placeholder="student@sccg.com"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="w-full h-11 px-3 text-sm rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#e03030] focus:ring-4 focus:ring-red-500/5 transition-all outline-none"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileBadge className="h-3 w-3 text-[#e03030]" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#666]">Certificate Class</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setData({ ...data, type: "participation" })}
                className={cn(
                  "px-4 py-3 text-[10px] font-bold text-center border rounded-xl transition-all flex flex-col items-center justify-center gap-1",
                  data.type === "participation" ? "bg-[#e03030] border-[#e03030] text-white shadow-lg shadow-red-500/20" : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100"
                )}
              >
                Teilnahme<br/><span className={cn("text-[8px] opacity-70", data.type === "participation" ? "text-white" : "text-gray-400")}>Participation</span>
              </button>
              <button
                onClick={() => setData({ ...data, type: "completion" })}
                className={cn(
                  "px-4 py-3 text-[10px] font-bold text-center border rounded-xl transition-all flex flex-col items-center justify-center gap-1",
                  data.type === "completion" ? "bg-[#e03030] border-[#e03030] text-white shadow-lg shadow-red-500/20" : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100"
                )}
              >
                Abschluss<br/><span className={cn("text-[8px] opacity-70", data.type === "completion" ? "text-white" : "text-gray-400")}>Completion</span>
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-3 w-3 text-[#e03030]" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#666]">Proficiency Level</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LEVEL_NAMES).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setData({ ...data, level: key })}
                  className={cn(
                    "px-2 py-3 text-[10px] font-black border rounded-xl transition-all flex flex-col items-center justify-center",
                    data.level === key ? "bg-[#e03030] border-[#e03030] text-white shadow-lg shadow-red-500/20" : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100"
                  )}
                >
                  {info.label}<br/><span className={cn("text-[7px] font-bold opacity-60", data.level === key ? "text-white" : "text-gray-400")}>{info.sub}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-3 w-3 text-[#e03030]" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#666]">Course Timeline</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Issue Date</label>
                <input
                  type="date"
                  value={data.issueDate}
                  onChange={(e) => setData({ ...data, issueDate: e.target.value })}
                  className="w-full h-11 px-3 text-sm rounded-lg border border-gray-200 bg-gray-50/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={data.endDate}
                  disabled={data.type === "participation"}
                  onChange={(e) => setData({ ...data, endDate: e.target.value })}
                  className={cn(
                    "w-full h-11 px-3 text-sm rounded-lg border border-gray-200 bg-gray-50/50",
                    data.type === "participation" && "opacity-30 grayscale pointer-events-none"
                  )}
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-3 w-3 text-[#e03030]" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#666]">Authority Seal</h3>
            </div>
            <input
              type="text"
              value={data.certId}
              onChange={(e) => setData({ ...data, certId: e.target.value })}
              placeholder="Certificate ID"
              className="w-full h-11 px-3 text-sm font-mono tracking-widest rounded-lg border border-gray-200 bg-gray-50/50"
            />
          </section>

          <Button 
            onClick={handlePreview}
            disabled={isLoading || !data.name}
            className="w-full h-14 bg-[#e03030] hover:bg-[#c02020] text-white transition-all rounded-xl shadow-xl shadow-red-500/20 font-black letter-spacing-1 text-xs"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "GENERATE PREVIEW"}
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col items-center justify-start p-10 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pinstripe-light.png')] opacity-20 pointer-events-none" />
        
        {isPreviewing ? (
          <div className="w-full max-w-[620px] space-y-6 z-20">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button 
                  disabled={isRegistering}
                  size="default"
                  className="bg-[#111] hover:bg-[#222] text-white font-black h-11 px-6 rounded-xl shadow-xl" 
                  onClick={handleIssueAndDownload}
                >
                  {isRegistering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {isRegistering ? "ISSUING..." : "DEPLOY & DOWNLOAD"}
                </Button>
                <button 
                  onClick={async () => {
                    const url = `portal.mysccg.de/verify/${data.certId}`;
                    await navigator.clipboard.writeText(url);
                    toast.success("Verification Link Copied!");
                  }}
                  className="flex items-center gap-2 px-6 h-11 text-xs font-black text-[#111] bg-white border-2 border-[#111] rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Share2 className="h-4 w-4" /> SHARE
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Hi-Def Ready</span>
              </div>
            </div>

            <div className="bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden border border-gray-200 ring-1 ring-black/5 transform transition-transform hover:scale-[1.01] duration-500">
              <canvas ref={canvasRef} className="w-full h-auto block" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 opacity-60">
              <div className="flex items-center gap-3 text-[9px] font-bold text-[#666] uppercase tracking-tighter">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" /> VERIFIED ID: {data.certId}
                </div>
                <div className="w-px h-3 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <Info className="h-3 w-3" /> PUBLIC ACCESS: TRUE
                </div>
              </div>
              <p className="text-[9px] font-medium italic text-[#888]">
                * This is a high-resolution production preview.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 z-20">
            <div className="relative">
              <div className="h-40 w-40 rounded-[48px] bg-white shadow-2xl flex items-center justify-center text-[#ddd] transform rotate-3 hover:rotate-0 transition-transform duration-500 border border-white">
                <FileText className="h-20 w-20" />
              </div>
              <div className="absolute -top-4 -right-4 h-12 w-12 rounded-2xl bg-[#e03030] shadow-lg flex items-center justify-center text-white animate-bounce">
                <Award className="h-6 w-6" />
              </div>
            </div>
            <div className="max-w-[320px] space-y-2">
              <h3 className="text-xl font-black text-[#111] uppercase tracking-tighter">Production Studio</h3>
              <p className="text-sm text-[#666] font-medium leading-relaxed">Configuring student credentials in the side panel will generate a secure, high-fidelity certificate for SCCG.</p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-white/50 text-[10px] font-bold text-[#888]">MARKETPLACE READY</div>
              <div className="px-4 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-white/50 text-[10px] font-bold text-[#888]">QR SECURED</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
