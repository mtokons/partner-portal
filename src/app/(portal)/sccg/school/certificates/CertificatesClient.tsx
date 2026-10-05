"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  GraduationCap,
  Layers,
  QrCode,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
  FileText,
  Calendar,
  Edit,
} from "lucide-react";
import type {
  SchoolBatch,
  SchoolCertificate,
  SchoolEnrollment,
} from "@/types";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import PrintableCertificate from "./PrintableCertificate";
import {
  deleteCertificateAction,
  issueCertificateAction,
  markEnrollmentCompletedAction,
  revokeCertificateAction,
  updateCertificateTimelineAction,
  updateEnrollmentTimelineAction,
} from "../actions";

interface CertificatesClientProps {
  initialCertificates: SchoolCertificate[];
  enrollments: SchoolEnrollment[];
  batches: SchoolBatch[];
}

export default function CertificatesClient({
  initialCertificates,
  enrollments,
  batches,
}: CertificatesClientProps) {
  const [certificates, setCertificates] = useState(initialCertificates);
  const [enrollmentsList, setEnrollmentsList] = useState(enrollments);
  const [search, setSearch] = useState("");
  const [selectedCert, setSelectedCert] = useState<SchoolCertificate | null>(null);
  const [editingEnrollmentTimeline, setEditingEnrollmentTimeline] = useState<SchoolEnrollment | null>(null);
  const [editingCertTimeline, setEditingCertTimeline] = useState<SchoolCertificate | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!selectedCert) return;
    setDownloadingPdf(true);
    try {
      const element = document.getElementById("printable-certificate");
      if (!element) throw new Error("Certificate element not found");

      // Clone the element to render at full size off-screen
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.transform = "none";
      clone.style.position = "fixed";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.zIndex = "-1";
      document.body.appendChild(clone);

      // CRITICAL FIX: cloneNode(true) does NOT copy HTML5 Canvas drawing buffer.
      // Replace every canvas in clone with an <img> containing the toDataURL of the original canvas.
      const origCanvases = element.querySelectorAll("canvas");
      const cloneCanvases = clone.querySelectorAll("canvas");

      await Promise.all(
        Array.from(origCanvases).map((orig, idx) => {
          const dest = cloneCanvases[idx];
          if (!dest) return Promise.resolve();

          return new Promise<void>((resolve) => {
            try {
              const dataUrl = orig.toDataURL("image/png");
              const img = document.createElement("img");
              img.src = dataUrl;
              img.width = orig.width;
              img.height = orig.height;
              img.style.width = dest.style.width || `${orig.width}px`;
              img.style.height = dest.style.height || `${orig.height}px`;
              img.style.display = "block";

              const finish = () => {
                dest.parentNode?.replaceChild(img, dest);
                resolve();
              };

              if (img.complete) {
                finish();
              } else {
                img.onload = finish;
                img.onerror = finish;
              }
            } catch (e) {
              console.warn("Could not copy canvas to image:", e);
              try {
                dest.width = orig.width;
                dest.height = orig.height;
                dest.getContext("2d")?.drawImage(orig, 0, 0);
              } catch (_) {}
              resolve();
            }
          });
        })
      );

      // Wait 100ms to ensure DOM updates and image rendering complete
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      pdf.save(`Zertifikat_${selectedCert.certificateNumber || "SCCG"}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF-Erstellung fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDeleteCertificate = async (certId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie dieses Zertifikat löschen möchten?")) return;
    setLoadingId(`delete-${certId}`);
    try {
      await deleteCertificateAction(certId);
      setCertificates((prev) => prev.filter((c) => c.id !== certId));
    } catch (err: any) {
      alert(err.message || "Fehler beim Löschen des Zertifikats");
    } finally {
      setLoadingId(null);
    }
  };

  // Eligible students: completed or enrolled
  const eligibleEnrollments = enrollmentsList.filter(
    (e) => !certificates.some((c) => c.enrollmentId === e.id && c.status === "issued")
  );

  const filteredCertificates = certificates.filter((c) => {
    return (
      !search ||
      c.studentName.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.verificationCode || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-7 max-w-7xl mx-auto page-enter pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#F5B800] uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" /> Academic Credentials
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Certificates & Evaluation Sheets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Issue official CEFR German language completion credentials with cryptographic QR verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground">
            {certificates.length} Issued Certificates
          </span>
        </div>
      </div>

      {/* ── Eligible Students for Certificate Issuance ── */}
      {eligibleEnrollments.length > 0 && (
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#0F4C81]" />
                Eligible Students for Certificate Generation
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Students ready for evaluation finalization and certificate issuance.
              </p>
            </div>
            <span className="text-xs font-bold text-muted-foreground">{eligibleEnrollments.length} Pending</span>
          </div>

          <div className="divide-y divide-border/60 text-xs">
            {eligibleEnrollments.slice(0, 8).map((e) => {
              const enrolledBatch = batches.find((b) => b.id === e.batchId);
              const defaultBatchTimeline = enrolledBatch?.startDate && enrolledBatch?.endDate
                ? `${new Date(enrolledBatch.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} — ${new Date(enrolledBatch.endDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`
                : "Standard";
              return (
                <div key={e.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{e.studentName}</span>
                      <span className="text-muted-foreground">
                        {e.courseName || e.batchCode} · 🇩🇪 {e.desiredLevel || "A1"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>Zertifikat-Zeitraum:</span>
                      <strong className="text-foreground">{e.courseTimeline || defaultBatchTimeline}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingEnrollmentTimeline(e)}
                      className="px-3 py-1.5 rounded-xl border border-[#0F4C81]/30 hover:bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold transition-all flex items-center gap-1"
                      title="Zeitraum für Zertifikat bearbeiten"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Zeitraum
                    </button>

                    <button
                      onClick={async () => {
                        setLoadingId(`completion-${e.id}`);
                        try {
                          const fd = new FormData();
                          fd.set("finalGrade", e.finalGrade || "Sehr Gut (1.0)");
                          fd.set("examScore", String(e.examScore || 95));
                          await markEnrollmentCompletedAction(e.id, fd);
                          await issueCertificateAction(e.id, "completion");
                          window.location.reload();
                        } catch (err: any) {
                          alert(err.message || "Failed to issue certificate");
                        } finally {
                          setLoadingId(null);
                        }
                      }}
                      disabled={loadingId !== null}
                      className="px-3 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-[#0D3F6D] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F5B800]" /> Completion
                    </button>

                    <button
                      onClick={async () => {
                        setLoadingId(`participation-${e.id}`);
                        try {
                          const fd = new FormData();
                          fd.set("finalGrade", "N/A");
                          fd.set("examScore", "0");
                          await markEnrollmentCompletedAction(e.id, fd);
                          await issueCertificateAction(e.id, "participation");
                          window.location.reload();
                        } catch (err: any) {
                          alert(err.message || "Failed to issue certificate");
                        } finally {
                          setLoadingId(null);
                        }
                      }}
                      disabled={loadingId !== null}
                      className="px-3 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      Participation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Issued Certificates Table ── */}
      <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-foreground">Verified Certificates Registry</h2>
            <p className="text-xs text-muted-foreground">Authenticated German language course completions.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search certificates..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border/60">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Zertifikat #</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Kurs & Niveau</th>
                <th className="py-3.5 px-4">Note / Ergebnis</th>
                <th className="py-3.5 px-4">Ausstellungsdatum</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Keine ausgestellten Zertifikate gefunden.
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F4C81]">
                      {c.certificateNumber || c.sccgId || "SCCG-CERT"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {c.studentName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#0F4C81]/10 text-[#0F4C81] font-black text-[11px] mr-1.5">
                        🇩🇪 {c.courseLevel || "A1"}
                      </span>
                      <span className="text-muted-foreground">{c.courseName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-600">{c.finalGrade || "Sehr Gut"}</span>
                      {c.examScore !== undefined && (
                        <span className="text-muted-foreground ml-1">({c.examScore}%)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {c.issuedDate ? new Date(c.issuedDate).toLocaleDateString("de-DE") : "Kürzlich"}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCert(c)}
                        className="px-2.5 py-1 rounded-lg border text-xs font-bold hover:bg-muted"
                      >
                        Ansehen
                      </button>

                      <button
                        onClick={() => setEditingCertTimeline(c)}
                        className="px-2.5 py-1 rounded-lg border border-[#0F4C81]/30 text-[#0F4C81] hover:bg-[#0F4C81]/10 text-xs font-bold inline-flex items-center gap-1"
                        title="Zertifikat-Zeitraum bearbeiten"
                      >
                        <Calendar className="w-3 h-3" /> Zeitraum
                      </button>

                      <Link
                        href={`/verify/${c.verificationCode}`}
                        target="_blank"
                        className="px-2.5 py-1 rounded-lg bg-[#0F4C81] hover:bg-[#0D3F6D] text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <QrCode className="w-3 h-3 text-[#F5B800]" /> QR <ExternalLink className="w-3 h-3" />
                      </Link>

                      <button
                        onClick={() => handleDeleteCertificate(c.id)}
                        disabled={loadingId === `delete-${c.id}`}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" /> {loadingId === `delete-${c.id}` ? "..." : "Löschen"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 max-w-[600px] w-full shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-[#F5B800]" />
                Zertifikat-Vorschau
              </h3>
              <button onClick={() => setSelectedCert(null)} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
            </div>

            {/* Certificate Preview Card - portrait A4 scaled down */}
            <div className="bg-slate-100 p-2 rounded-2xl border border-border overflow-hidden shadow-inner flex justify-center">
              <div
                id="printable-certificate"
                style={{
                  transform: "scale(0.55)",
                  transformOrigin: "top center",
                  marginBottom: "-505px",
                }}
              >
                <PrintableCertificate
                  certificate={selectedCert}
                  batch={batches.find((b) => selectedCert.enrollmentId && b.id === enrollments.find(e => e.id === selectedCert.enrollmentId)?.batchId)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> {downloadingPdf ? "Wird erstellt..." : "PDF herunterladen"}
              </button>
              <button
                type="button"
                onClick={() => setEditingCertTimeline(selectedCert)}
                className="h-10 px-3 rounded-xl border border-[#0F4C81]/30 hover:bg-[#0F4C81]/10 text-[#0F4C81] font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                title="Zeitraum für dieses Zertifikat anpassen"
              >
                <Calendar className="w-4 h-4" /> Zeitraum
              </button>
              <Link
                href={`/verify/${selectedCert.verificationCode}`}
                target="_blank"
                className="flex-1 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-4 h-4 text-[#F5B800]" /> QR-Verifizierung
              </Link>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="px-4 h-10 rounded-xl border font-bold text-xs hover:bg-muted"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Enrollment Course Timeline (pre-issuance) ── */}
      {editingEnrollmentTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0F4C81]" /> Kurs-Zeitraum festlegen
              </h3>
              <button onClick={() => setEditingEnrollmentTimeline(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            <p className="text-xs text-muted-foreground">
              Legen Sie den verbindlichen Zeitraum für das Zertifikat von <strong>{editingEnrollmentTimeline.studentName}</strong> fest.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const timeline = String(fd.get("courseTimeline") || "").trim();
                setLoadingId(`timeline-${editingEnrollmentTimeline.id}`);
                try {
                  await updateEnrollmentTimelineAction(editingEnrollmentTimeline.id, timeline);
                  setEnrollmentsList((prev) =>
                    prev.map((item) =>
                      item.id === editingEnrollmentTimeline.id ? { ...item, courseTimeline: timeline } : item
                    )
                  );
                  setEditingEnrollmentTimeline(null);
                } catch (err: any) {
                  alert(err.message || "Fehler beim Aktualisieren des Zeitraums");
                } finally {
                  setLoadingId(null);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">Student</label>
                <div className="p-2.5 rounded-xl bg-muted/50 font-bold text-foreground">
                  {editingEnrollmentTimeline.studentName} ({editingEnrollmentTimeline.courseName})
                </div>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">
                  Zertifikat-Zeitraum *
                </label>
                <input
                  required
                  name="courseTimeline"
                  defaultValue={
                    editingEnrollmentTimeline.courseTimeline ||
                    (() => {
                      const b = batches.find((x) => x.id === editingEnrollmentTimeline.batchId);
                      return b?.startDate && b?.endDate
                        ? `${new Date(b.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} — ${new Date(b.endDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`
                        : "";
                    })()
                  }
                  placeholder="z. B. Juni 2026 — August 2026"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-foreground font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Wird auf dem Zertifikat formatiert als: <em>ZEITRAUM: [Eingabe]</em>
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setEditingEnrollmentTimeline(null)} className="w-1/2 h-10 rounded-xl border font-bold hover:bg-muted">Abbrechen</button>
                <button type="submit" disabled={loadingId !== null} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-[#0D3F6D] transition-colors disabled:opacity-50">
                  {loadingId ? "Speichern..." : "Zeitraum speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Issued Certificate Course Timeline ── */}
      {editingCertTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0F4C81]" /> Zertifikat-Zeitraum anpassen
              </h3>
              <button onClick={() => setEditingCertTimeline(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            <p className="text-xs text-muted-foreground">
              Passen Sie den gedruckten Zeitraum für Zertifikat <strong>{editingCertTimeline.certificateNumber}</strong> ({editingCertTimeline.studentName}) an.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const timeline = String(fd.get("courseTimeline") || "").trim();
                setLoadingId(`cert-timeline-${editingCertTimeline.id}`);
                try {
                  await updateCertificateTimelineAction(editingCertTimeline.id, timeline);
                  setCertificates((prev) =>
                    prev.map((item) =>
                      item.id === editingCertTimeline.id ? { ...item, courseTimeline: timeline } : item
                    )
                  );
                  if (selectedCert && selectedCert.id === editingCertTimeline.id) {
                    setSelectedCert((prev) => prev ? { ...prev, courseTimeline: timeline } : null);
                  }
                  setEditingCertTimeline(null);
                } catch (err: any) {
                  alert(err.message || "Fehler beim Aktualisieren des Zeitraums");
                } finally {
                  setLoadingId(null);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">Student</label>
                <div className="p-2.5 rounded-xl bg-muted/50 font-bold text-foreground">
                  {editingCertTimeline.studentName} · {editingCertTimeline.courseName}
                </div>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">
                  Zertifikat-Zeitraum *
                </label>
                <input
                  required
                  name="courseTimeline"
                  defaultValue={
                    editingCertTimeline.courseTimeline ||
                    (() => {
                      const b = batches.find((x) => x.id === editingCertTimeline.batchId);
                      return b?.startDate && b?.endDate
                        ? `${new Date(b.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} — ${new Date(b.endDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`
                        : "";
                    })()
                  }
                  placeholder="z. B. Juni 2026 — August 2026"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-foreground font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Erscheint auf dem Zertifikat als: <em>ZEITRAUM: [Eingabe]</em>
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setEditingCertTimeline(null)} className="w-1/2 h-10 rounded-xl border font-bold hover:bg-muted">Abbrechen</button>
                <button type="submit" disabled={loadingId !== null} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-[#0D3F6D] transition-colors disabled:opacity-50">
                  {loadingId ? "Speichern..." : "Zeitraum speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
