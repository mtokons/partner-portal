"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchCertificateById, revokeCertificateAction } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Award, Shield, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SchoolCertificate } from "@/types";
import CertificatePrintView from "@/components/ui/CertificatePrintView";
import { generateCertificatePDF } from "@/lib/pdf-generator";
import { Download, Printer } from "lucide-react";

export default function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [certId, setCertId] = useState<string | null>(null);
  const [cert, setCert] = useState<SchoolCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevoke, setShowRevoke] = useState(false);

  useEffect(() => { params.then(({ id }) => setCertId(id)); }, [params]);

  const loadCert = useCallback(async () => {
    if (!certId) return;
    setLoading(true);
    try {
      const c = await fetchCertificateById(certId);
      setCert(c);
    } finally { setLoading(false); }
  }, [certId]);

  useEffect(() => { loadCert(); }, [loadCert]);

  async function handleRevoke() {
    if (!revokeReason.trim() || !certId) return;
    setRevoking(true);
    try {
      await revokeCertificateAction(certId, revokeReason);
      await loadCert();
      setShowRevoke(false);
    } finally { setRevoking(false); }
  }

  if (loading || !cert) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 print:m-0 print:absolute print:inset-0 print:max-w-none">
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/admin/school/certificates" className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Certificate Details</h1>
          <p className="text-sm text-muted-foreground font-mono">{cert.certificateNumber}</p>
        </div>
        <div className="flex gap-2 hidden sm:flex">
          <button 
            onClick={() => generateCertificatePDF(cert)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-all active:scale-95"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-all"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
        <Badge variant={cert.status === "issued" ? "default" : "destructive"} className="capitalize">{cert.status}</Badge>
      </div>

      <Card className={`print:hidden ${cert.status === "revoked" ? "border-red-200 bg-red-50/50" : ""}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center mb-6">
            <div className={`p-4 rounded-full ${cert.status === "issued" ? "bg-green-100" : "bg-red-100"}`}>
              <Award className={`h-12 w-12 ${cert.status === "issued" ? "text-green-600" : "text-red-600"}`} />
            </div>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold capitalize">{cert.certificateType === "completion" ? "Course Completion Certificate" : "Participation Certificate"}</h2>
            <p className="text-sm text-muted-foreground mt-1">Awarded to</p>
            <p className="text-lg font-semibold">{cert.studentName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Course</p>
              <p className="font-medium">{cert.courseName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Level</p>
              <p className="font-medium">{cert.courseLevel}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Batch</p>
              <p className="font-medium font-mono">{cert.batchCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Issue Date</p>
              <p className="font-medium">{cert.issuedDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Attendance</p>
              <p className="font-medium">{cert.attendancePercentage}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Final Grade</p>
              <p className="font-bold text-lg">{cert.finalGrade || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Issued By</p>
              <p className="font-medium">{cert.issuedByName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">SCCG ID</p>
              <p className="font-medium font-mono">{cert.studentSccgId || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Verification</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Verification Code:</span>
            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{cert.verificationCode}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Verification URL:</span>
            <Link href={cert.verificationUrl} target="_blank" className="text-primary hover:underline text-sm flex items-center gap-1">
              {cert.verificationUrl} <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">QR Code:</span>
            <span className="text-sm">{cert.qrCodeUrl || "Not generated"}</span>
          </div>
        </CardContent>
      </Card>

      {cert.status === "revoked" && (
        <Card className="border-red-200 print:hidden">
          <CardHeader><CardTitle className="text-red-700">Revocation Details</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p><span className="text-muted-foreground">Reason:</span> {cert.revocationReason}</p>
            <p><span className="text-muted-foreground">Revoked by:</span> {cert.revokedBy}</p>
            <p><span className="text-muted-foreground">Revoked at:</span> {cert.revokedAt}</p>
          </CardContent>
        </Card>
      )}

      {cert.status === "issued" && (
        <Card className="print:hidden">
          <CardContent className="pt-6">
            {!showRevoke ? (
              <button onClick={() => setShowRevoke(true)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                Revoke Certificate
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-700 font-medium">This action cannot be undone. Provide a reason:</p>
                <Input value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="Reason for revocation" />
                <div className="flex gap-2">
                  <button onClick={handleRevoke} disabled={revoking || !revokeReason.trim()}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                    {revoking ? "Revoking..." : "Confirm Revoke"}
                  </button>
                  <button onClick={() => setShowRevoke(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Print View Layer */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
        <CertificatePrintView certificate={cert} />
      </div>
    </div>
  );
}
