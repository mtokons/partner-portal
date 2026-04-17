import { getSchoolCertificates } from "@/lib/firestore-services";
import { findSharePointCertificate } from "@/lib/sharepoint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let cert = null;
  try {
    // Try by verification code first
    let results = await getSchoolCertificates({ verificationCode: code });
    if (results.length === 0) {
      // Try by certificate number (e.g. SCCG26A1xxx)
      const allCerts = await getSchoolCertificates();
      const match = allCerts.find(c => c.certificateNumber === code);
      if (match) results = [match];
    }
    cert = results[0] || null;

    // Fallback: check SharePoint if Firestore didn't find it
    if (!cert) {
      cert = await findSharePointCertificate(code);
    }
  } catch {
    // DB error — try SharePoint as fallback
    try {
      cert = await findSharePointCertificate(code);
    } catch {
      // Both failed — treat as not found
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">SCCG Certificate Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Verification Code: <code className="bg-muted px-2 py-0.5 rounded">{code}</code></p>
        </div>

        {!cert ? (
          <Card className="border-red-200">
            <CardContent className="pt-8 pb-8 text-center">
              <ShieldAlert className="h-16 w-16 mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-red-700">Certificate Not Found</h2>
              <p className="text-sm text-muted-foreground mt-2">
                No certificate matches this verification code. It may be invalid or the certificate does not exist.
              </p>
            </CardContent>
          </Card>
        ) : cert.status === "revoked" ? (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-8 pb-8 text-center">
              <ShieldX className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-red-700">Certificate Revoked</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This certificate has been revoked and is no longer valid.
              </p>
              <div className="mt-6 text-left bg-white rounded-lg p-4 border space-y-2 text-sm">
                <InfoRow label="Certificate #" value={cert.certificateNumber} />
                <InfoRow label="Student" value={cert.studentName} />
                <InfoRow label="Course" value={`${cert.courseName} (${cert.courseLevel})`} />
                <InfoRow label="Revoked" value={cert.revokedAt?.split("T")[0] || "Unknown"} />
                {cert.revocationReason && <InfoRow label="Reason" value={cert.revocationReason} />}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <ShieldCheck className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-xl font-bold text-green-700">Certificate Verified</h2>
                <p className="text-sm text-muted-foreground mt-1">This is an authentic certificate issued by SCCG.</p>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="p-4 rounded-full bg-green-100">
                  <Award className="h-12 w-12 text-green-600" />
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">AWARDED TO</p>
                <p className="text-xl font-bold">{cert.studentName}</p>
                {cert.studentSccgId && <p className="text-xs font-mono text-muted-foreground">{cert.studentSccgId}</p>}
              </div>

              <div className="mt-6 bg-white rounded-lg p-4 border space-y-2 text-sm">
                <InfoRow label="Certificate #" value={cert.certificateNumber} />
                <InfoRow label="Type" value={cert.certificateType === "completion" ? "Course Completion" : "Participation"} />
                <InfoRow label="Course" value={`${cert.courseName} (${cert.courseLevel})`} />
                <InfoRow label="Batch" value={cert.batchCode} />
                <InfoRow label="Issue Date" value={cert.issuedDate} />
                <InfoRow label="Attendance" value={`${cert.attendancePercentage}%`} />
                {cert.finalGrade && <InfoRow label="Grade" value={cert.finalGrade} />}
                {cert.examScore != null && <InfoRow label="Exam Score" value={`${cert.examScore}%`} />}
                <InfoRow label="Issued By" value={cert.issuedByName} />
              </div>

              <div className="mt-4 text-center">
                <Badge variant="default" className="bg-green-600">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          SCCG Partner Portal — Certificate Verification System
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
