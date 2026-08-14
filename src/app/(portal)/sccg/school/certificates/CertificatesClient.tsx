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
  UserCheck,
  Users,
  X,
  FileText,
} from "lucide-react";
import type {
  SchoolBatch,
  SchoolCertificate,
  SchoolEnrollment,
} from "@/types";
import {
  issueCertificateAction,
  markEnrollmentCompletedAction,
  revokeCertificateAction,
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
  const [search, setSearch] = useState("");
  const [selectedCert, setSelectedCert] = useState<SchoolCertificate | null>(null);
  const [loading, setLoading] = useState(false);

  // Eligible students: completed or enrolled
  const eligibleEnrollments = enrollments.filter(
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
            {eligibleEnrollments.slice(0, 5).map((e) => (
              <div key={e.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-foreground">{e.studentName}</span>
                  <span className="text-muted-foreground ml-2">
                    {e.courseName || e.batchCode} · 🇩🇪 {e.desiredLevel || "A1"}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    setLoading(true);
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
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-[#0D3F6D] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F5B800]" /> Issue Certificate & Sheet
                </button>
              </div>
            ))}
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
                <th className="py-3.5 px-4 rounded-l-xl">Certificate #</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Course & Level</th>
                <th className="py-3.5 px-4">Grade / Score</th>
                <th className="py-3.5 px-4">Issued Date</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No issued certificates found.
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
                      {c.issuedDate ? new Date(c.issuedDate).toLocaleDateString() : "Recent"}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCert(c)}
                        className="px-2.5 py-1 rounded-lg border text-xs font-bold hover:bg-muted"
                      >
                        View Sheet
                      </button>

                      <Link
                        href={`/verify/${c.verificationCode}`}
                        target="_blank"
                        className="px-2.5 py-1 rounded-lg bg-[#0F4C81] hover:bg-[#0D3F6D] text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <QrCode className="w-3 h-3 text-[#F5B800]" /> QR Verify <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Certificate & Evaluation Sheet Preview ── */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-[#F5B800]" />
                Official Certificate & Evaluation Sheet
              </h3>
              <button onClick={() => setSelectedCert(null)} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
            </div>

            {/* Certificate Preview Card */}
            <div className="bg-gradient-to-br from-[#0F4C81] via-[#155A96] to-[#0A355C] text-white p-8 rounded-3xl border-4 border-[#F5B800] relative overflow-hidden shadow-2xl space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F5B800] text-slate-950 inline-block mb-2">
                    SCCG Career Lab Germany
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                    Zertifikat / Certificate
                  </h2>
                  <p className="text-xs text-white/80">German Language CEFR Competence</p>
                </div>
                <Award className="w-12 h-12 text-[#F5B800]" />
              </div>

              <div className="text-center py-4 space-y-2 border-y border-white/20">
                <p className="text-xs text-white/80 uppercase tracking-widest">This is to certify that</p>
                <h3 className="text-2xl sm:text-3xl font-black text-[#F5B800]">{selectedCert.studentName}</h3>
                <p className="text-xs text-white/90">
                  has successfully completed the course <strong className="text-white">{selectedCert.courseName}</strong> at level <strong className="text-[#F5B800]">🇩🇪 {selectedCert.courseLevel || "A1"}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/10 p-3.5 rounded-2xl">
                <div>
                  <span className="text-white/70 block text-[10px]">Final Grade</span>
                  <span className="font-bold text-white">{selectedCert.finalGrade || "Sehr Gut (1.0)"}</span>
                </div>
                <div>
                  <span className="text-white/70 block text-[10px]">Exam Score</span>
                  <span className="font-bold text-white">{selectedCert.examScore || 95}%</span>
                </div>
                <div>
                  <span className="text-white/70 block text-[10px]">Date of Issue</span>
                  <span className="font-bold text-white">
                    {selectedCert.issuedDate ? new Date(selectedCert.issuedDate).toLocaleDateString() : "Recent"}
                  </span>
                </div>
                <div>
                  <span className="text-white/70 block text-[10px]">QR Verification</span>
                  <span className="font-mono text-[#F5B800]">{selectedCert.verificationCode}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/70 pt-2">
                <span>Authorized by {selectedCert.issuedByName || "SCCG Academic Board"}</span>
                <span>mysccg.de/verify</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/verify/${selectedCert.verificationCode}`}
                target="_blank"
                className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-4 h-4 text-[#F5B800]" /> Open Public Verification
              </Link>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="w-1/2 h-10 rounded-xl border font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
