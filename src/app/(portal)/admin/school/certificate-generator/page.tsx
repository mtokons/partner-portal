"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Award, Download, Share2, User, Mail, Calendar, 
  Layers, CheckCircle2, ShieldCheck, Loader2, ArrowRight, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { registerManualCertificate } from "../actions";
import { toast } from "sonner";

const LEVEL_NAMES: Record<string, string> = {
  A1: "Anfänger",
  A2: "Grundstufe / Grundlagen",
  B1: "Mittelstufe",
  B2: "Oberstufe",
  C1: "Fortgeschrittener",
  C2: "Mastery / Kompetenz"
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
  const [lastRegisteredId, setLastRegisteredId] = useState<string | null>(null);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

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
    const W = 1588; // 794 * 2
    const H = 2246; // 1123 * 2
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Subtle texture layer (faint cream)
    ctx.fillStyle = "#fdfcf9";
    ctx.fillRect(40, 40, W - 80, H - 80);

    // Intricate Border System
    // Outer Thick Border
    ctx.strokeStyle = "#8e44ad"; // Deep Purple
    ctx.lineWidth = 10;
    ctx.strokeRect(60, 60, W - 120, H - 120);

    // Inner Pattern Border
    ctx.strokeStyle = "#d7bde2"; // Light Purple
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, W - 160, H - 160);

    // Floral Corners (simulated)
    const drawCorner = (x: number, y: number, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.strokeStyle = "#8e44ad";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arcTo(100, 0, 100, 100, 50);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(60, 60, 0);
    drawCorner(W - 60, 60, Math.PI / 2);
    drawCorner(W - 60, H - 60, Math.PI);
    drawCorner(60, H - 60, -Math.PI / 2);

    // Watermark
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.font = "bold 120px 'Outfit', sans-serif";
    ctx.fillStyle = "#8e44ad";
    ctx.textAlign = "center";
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 4);
    for (let x = -W; x < W; x += 400) {
      for (let y = -H; y < H; y += 400) {
        ctx.fillText("SCCG", x, y);
      }
    }
    ctx.restore();

    // 1. Top Centered Logo
    const topLogoWidth = 400;
    await drawLogo(ctx, W / 2 - topLogoWidth / 2, 120, topLogoWidth);

    const title = data.type === "participation" ? "TEILNAHMEBESCHEINIGUNG" : "ABSCHLUSSZERTIFIKAT";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Title (Shifted down for better spacing)
    ctx.font = "bold 68px Georgia, serif";
    ctx.fillStyle = "#8e44ad";
    ctx.fillText(title, W / 2, 580);

    // Divider
    ctx.strokeStyle = "#ebdef0";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(250, 680); ctx.lineTo(W - 250, 680); ctx.stroke();

    // Body Text
    ctx.font = "32px Georgia, serif";
    ctx.fillStyle = "#34495e";
    const bodyPrefix = data.type === "participation" 
      ? "nimmt hiermit aktiv an folgendem Sprachkurs teil:" 
      : "hat erfolgreich den folgenden Sprachkurs abgeschlossen:";
    ctx.fillText(bodyPrefix, W / 2, 780);

    // Name
    ctx.font = "bold 88px Georgia, serif";
    ctx.fillStyle = "#2c3e50";
    ctx.fillText(data.name || "[STUDENT NAME]", W / 2, 920);
    
    // Name Underline
    ctx.strokeStyle = "#8e44ad";
    ctx.lineWidth = 4;
    const nameW = ctx.measureText(data.name || "[STUDENT NAME]").width;
    ctx.beginPath(); ctx.moveTo(W/2 - nameW/2, 975); ctx.lineTo(W/2 + nameW/2, 975); ctx.stroke();

    // Course Highlights
    ctx.fillStyle = "#fdf9ff";
    ctx.strokeStyle = "#d7bde2";
    const boxY = 1080, boxH = 140;
    roundRect(ctx, 200, boxY, W - 400, boxH, 20);
    ctx.fill(); ctx.stroke();

    ctx.font = "bold 42px Georgia, serif";
    ctx.fillStyle = "#2c3e50";
    ctx.fillText(`Deutsch als Fremdsprache: Niveau ${data.level}`, W / 2, boxY + boxH/2 - 5);
    ctx.font = "24px Georgia, serif";
    ctx.fillStyle = "#7f8c8d";
    ctx.fillText(`(${LEVEL_NAMES[data.level]})`, W / 2, boxY + boxH/2 + 35);

    // Status Detail
    let statusMsg = "";
    if (data.type === "participation") {
      statusMsg = "Status: Der Kurs ist derzeit fortlaufend.";
    } else {
      const dateStr = data.endDate ? formatDate(data.endDate) : "Abschlussdatum";
      statusMsg = `Status: Erfolgreich abgeschlossen am ${dateStr}.`;
    }
    ctx.font = "italic 28px Georgia, serif";
    ctx.fillStyle = "#95a5a6";
    ctx.textAlign = "left";
    ctx.fillText(statusMsg, 200, 1300);

    // Reference Info Bar
    ctx.strokeStyle = "#ebdef0";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(200, 1380); ctx.lineTo(W - 200, 1380); ctx.stroke();

    ctx.font = "26px sans-serif";
    ctx.fillStyle = "#bdc3c7";
    ctx.textAlign = "left";
    ctx.fillText(`Ausstellungsdatum: ${formatDate(data.issueDate)}`, 200, 1440);
    
    ctx.textAlign = "right";
    ctx.fillText(`Zertifikat-ID: ${data.certId}`, W - 200, 1440);

    // Official Footer Section
    const footerStartY = 1750;
    
    // System Generated Disclaimer
    ctx.textAlign = "center";
    ctx.font = "italic 22px sans-serif";
    ctx.fillStyle = "#95a5a6";
    ctx.fillText("Dies ist ein systemgeneriertes Zertifikat und ist ohne Unterschrift gültig.", W/2, footerStartY - 100);

    ctx.font = "bold 42px sans-serif";
    ctx.fillStyle = "#2c3e50";
    ctx.fillText("SCCG CAREER LAB UG", W/2, footerStartY);
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("(HAFTUNGSBESCHRÄNKT), HAMBURG", W/2, footerStartY + 55);

    // Contact Row
    const contactY = footerStartY + 140;
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#7f8c8d";
    
    // Address (Left)
    ctx.textAlign = "left";
    ctx.fillText("Julius-Ludowieg-Straße 46,", 250, contactY);
    ctx.fillText("21073 Hamburg.", 250, contactY + 35);

    // Email/Phone (Middle)
    ctx.textAlign = "center";
    ctx.fillText("admin@mysccg.de", W/2, contactY);
    ctx.fillText("+49 159 05840718", W/2, contactY + 35);

    // Website (Right)
    ctx.textAlign = "right";
    ctx.fillText("www.mysccg.de", W - 250, contactY + 15);

    // Registration line
    ctx.textAlign = "center";
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#bdc3c7";
    ctx.fillText("REGISTRATION NO: HRB 194679 , TAX ID: 4775601448", W/2, contactY + 100);

    // QR Code — top right corner, inside border
    const qrCanvas = qrWrapperRef.current?.querySelector("canvas");
    if (qrCanvas) {
      const qrSize = 180;
      const rightBorder = W - 120; // inner border right edge
      const topBorder = 100; // inner border top edge
      const qrX = rightBorder - qrSize - 40; // 40px padding from right border
      const qrY = topBorder + 40; // 40px padding from top border
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#8e44ad";
      ctx.textAlign = "center";
      ctx.fillText("Scan to Verify", qrX + qrSize / 2, qrY + qrSize + 25);

      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#bdc3c7";
      ctx.textAlign = "center";
      // Wrap the URL in multiple lines for better fit
      const verifyUrl = `portal.mysccg.de/verify/${data.certId}`;
      ctx.fillText(verifyUrl, qrX + qrSize / 2, qrY + qrSize + 45);
    }
  };

  const drawLogo = async (ctx: CanvasRenderingContext2D, x: number, y: number, width?: number) => {
    try {
      const logoImg = await loadImage("/assets/sccg-logo.png");
      const logoSize = width || 220;
      const aspectRatio = logoImg.naturalHeight / logoImg.naturalWidth;
      ctx.drawImage(logoImg, x, y, logoSize, logoSize * aspectRatio);
    } catch (err) {
      console.error("Logo load failed", err);
      ctx.save();
      ctx.font = "bold 64px sans-serif";
      ctx.fillStyle = "#e74c3c";
      ctx.textAlign = "left";
      ctx.fillText("SCCG", x, y + 80);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#95a5a6";
      ctx.fillText("Connecting Talents Empowering Career", x, y + 120);
      ctx.restore();
    }
  };

  const drawSignature = async (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    try {
      const sigImg = await loadImage("/images/signature.png");
      const sigWidth = 250;
      const sigHeight = (sigImg.naturalHeight / sigImg.naturalWidth) * sigWidth;
      ctx.drawImage(sigImg, x, y, sigWidth, sigHeight);
    } catch (err) {
      console.error("Signature load failed", err);
    }
    ctx.save();
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#7f8c8d";
    ctx.textAlign = "left";
    ctx.fillText("Kurskoordinator", x, y + 140);
    ctx.fillText("SCCG Career Lab UG", x, y + 170);
    ctx.restore();
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
    if (!data.name) return;
    setIsLoading(true);
    setQrCodeData(`https://portal.mysccg.de/verify/${data.certId}`);
    setIsPreviewing(true);
    // Draw will happen in useEffect
    setIsLoading(false);
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
    const fileName = `SCCG_CERT_${safeName}.pdf`;
    pdf.save(fileName);
  };

  const handleIssueAndDownload = async () => {
    if (!data.name || !data.email) {
      toast.error("Please provide student name and email");
      return;
    }

    try {
      setIsRegistering(true);
      
      // 1. Register with backend
      const cert = await registerManualCertificate({
        studentName: data.name,
        studentEmail: data.email,
        certificateType: data.type,
        courseLevel: data.level,
        issueDate: data.issueDate,
        endDate: data.endDate || undefined
      });

      // 2. Update local data directly for drawing (don't rely on React state)
      const updatedCertId = cert.certificateNumber;
      const updatedQrUrl = `https://portal.mysccg.de/verify/${cert.verificationCode}`;
      
      // Update React state for UI
      setData(prev => ({ ...prev, certId: updatedCertId }));
      setQrCodeData(updatedQrUrl);
      setLastRegisteredId(cert.id);

      // 3. Wait for QR canvas to render with new data, then draw & download
      await new Promise<void>((resolve) => {
        // Allow React to re-render the hidden QR canvas
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      // Override data for this draw cycle directly
      const origCertId = data.certId;
      data.certId = updatedCertId;
      await drawCertificate();
      data.certId = origCertId; // restore (React state will update)

      downloadPDF();
      setIsRegistering(false);
      toast.success("Certificate issued and registered successfully!");

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to register certificate";
      console.error(err);
      toast.error(message);
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)] gap-6 p-2 lg:p-6 fade-in">
      {/* Hidden QR Canvas for PDF rendering */}
      {qrCodeData && (
        <div ref={qrWrapperRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <QRCodeCanvas value={qrCodeData} size={400} level="H" />
        </div>
      )}
      {/* Form Panel */}
      <div className="w-full lg:w-[400px] shrink-0 space-y-6">
        <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/70 backdrop-blur-xl border border-white/20">
          <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Award className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-black">Certificate Tool</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <User className="h-3 w-3" /> Student Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sadia Musarrat"
                  value={data.name}
                  onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="student@sccg.com"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</label>
                  <select
                    value={data.type}
                    onChange={(e) => setData({ ...data, type: e.target.value as CertType })}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none"
                  >
                    <option value="participation">Participation</option>
                    <option value="completion">Completion</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Level</label>
                  <select
                    value={data.level}
                    onChange={(e) => setData({ ...data, level: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none"
                  >
                    {Object.keys(LEVEL_NAMES).map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Issue Date
                  </label>
                  <input
                    type="date"
                    value={data.issueDate}
                    onChange={(e) => setData({ ...data, issueDate: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> End Date
                  </label>
                  <input
                    type="date"
                    value={data.endDate}
                    onChange={(e) => setData({ ...data, endDate: e.target.value })}
                    className={cn(
                      "w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none",
                      data.type === "participation" && "opacity-50 grayscale pointer-events-none"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Certificate Number</label>
                <input
                  type="text"
                  value={data.certId}
                  onChange={(e) => setData({ ...data, certId: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 font-mono text-sm tracking-wider"
                />
              </div>
            </div>

            <Button 
              onClick={handlePreview}
              disabled={isLoading || !data.name}
              className="w-full h-14 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 group shadow-xl shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Preview Document <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 min-h-[600px] flex flex-col items-center justify-start py-4">
        {isPreviewing ? (
          <div className="w-full max-w-[650px] space-y-6 animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <Button 
                  disabled={isRegistering}
                  className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 group" 
                  onClick={handleIssueAndDownload}
                >
                  {isRegistering ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                  )}
                  {isRegistering ? "Registering..." : "Issue & Export PDF"}
                </Button>
                <Button variant="ghost" className="rounded-xl h-11 px-6 group" onClick={async () => {
                  const linkUrl = qrCodeData || `https://portal.mysccg.de/verify/${data.certId}`;
                  if (!linkUrl) {
                    alert("No verification link available yet.");
                    return;
                  }
                  try {
                    await navigator.clipboard.writeText(linkUrl);
                    toast.success("Verification link copied!");
                  } catch {
                    const textarea = document.createElement("textarea");
                    textarea.value = linkUrl;
                    textarea.style.position = "fixed";
                    textarea.style.opacity = "0";
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);
                    toast.success("Verification link copied!");
                  }
                }}>
                  <Share2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> Share Link
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LIVE Preview</span>
              </div>
            </div>

            <div className="relative group/cert">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-purple-500/10 to-transparent blur-3xl opacity-30 group-hover/cert:opacity-50 transition-opacity rounded-full -z-10" />
              <Card className="border-0 shadow-2xl rounded-lg overflow-hidden ring-1 ring-black/5">
                <canvas ref={canvasRef} className="w-full h-auto block" />
              </Card>
              
              {/* Floating ID Tag */}
              <div className="absolute bottom-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-700">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <ShieldCheck className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Record Verification</p>
                  <p className="text-xs font-black text-slate-800 font-mono mt-1">{data.certId}</p>
                </div>
                {qrCodeData && (
                  <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm ml-2">
                    <QRCodeSVG value={qrCodeData} size={48} />
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-center text-xs text-muted-foreground font-medium italic">
              * The preview above is rendered at high definition. Exported PDF will maintain this quality.
            </p>
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-60">
            <div className="h-32 w-32 rounded-[40px] bg-slate-100 flex items-center justify-center text-slate-300 relative">
              <Award className="h-16 w-16" />
              <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-white shadow-xl flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-amber-400" />
              </div>
            </div>
            <div className="max-w-[280px]">
              <h3 className="text-lg font-black text-slate-500 uppercase tracking-tighter">Ready to Design</h3>
              <p className="text-sm text-slate-400 font-medium">Enter student details on the left to generate an official document</p>
            </div>
            <div className="flex gap-4">
              {[FileText, Layers, ShieldCheck].map((Icon, i) => (
                <div key={i} className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                  <Icon className="h-5 w-5" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
