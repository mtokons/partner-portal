import { headers } from "next/headers";
import { getSchoolCertificates } from "@/lib/firestore-services";
import { findSharePointCertificate } from "@/lib/sharepoint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";

// Public certificate verification — minimal PII surface, rate-limited.

const CODE_FORMAT = /^[A-Za-z0-9-]{6,64}$/;

// In-memory rate limit (best-effort; resets on cold start). Per-IP bucket.
type Bucket = { count: number; resetAt: number };
const buckets: Map<string, Bucket> =
  (globalThis as unknown as { __verifyBuckets?: Map<string, Bucket> }).__verifyBuckets ?? new Map();
(globalThis as unknown as { __verifyBuckets?: Map<string, Bucket> }).__verifyBuckets = buckets;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

function clientIp(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  b.count += 1;
  return b.count <= MAX_PER_WINDOW;
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const h = await headers();
  const ip = clientIp(h);

  const formatOk = CODE_FORMAT.test(code);
  const rateOk = checkRate(ip);

  let cert = null;
  if (formatOk && rateOk) {
    try {
      const results = await getSchoolCertificates({ verificationCode: code });
      cert = results[0] || null;
      if (!cert) {
        cert = await findSharePointCertificate(code);
      }
    } catch {
      try {
        cert = await findSharePointCertificate(code);
      } catch {
        // both lookups failed — treat as not found
      }
    }
  }

  const NotFoundCard = (
    <Card className="border-red-200">
      <CardContent className="pt-8 pb-8 text-center">
        <ShieldAlert className="h-16 w-16 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-red-700">Certificate Not Found</h2>
        <p className="text-sm text-muted-foreground mt-2">
          No certificate matches this verification code. It may be invalid or the certificate does not exist.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">SCCG Certificate Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verification Code: <code className="bg-muted px-2 py-0.5 rounded">{code}</code>
          </p>
        </div>

        {!rateOk ? (
          <Card className="border-amber-200">
            <CardContent className="pt-8 pb-8 text-center">
              <ShieldAlert className="h-16 w-16 mx-auto text-amber-400 mb-4" />
              <h2 className="text-xl font-bold text-amber-700">Too Many Requests</h2>
              <p className="text-sm text-muted-foreground mt-2">Please wait a minute and try again.</p>
            </CardContent>
          </Card>
        ) : !formatOk || !cert ? (
          NotFoundCard
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
                <InfoRow label="Course" value={cert.courseName} />
                <InfoRow label="Batch" value={cert.batchCode} />
                <InfoRow label="Issue Date" value={cert.issuedDate} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <ShieldCheck className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-xl font-bold text-green-700">Certificate Verified</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This is an authentic certificate issued by SCCG.
                </p>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="p-4 rounded-full bg-green-100">
                  <Award className="h-12 w-12 text-green-600" />
                </div>
              </div>

              <div className="mt-6 bg-white rounded-lg p-4 border space-y-2 text-sm">
                <InfoRow label="Certificate #" value={cert.certificateNumber} />
                <InfoRow
                  label="Type"
                  value={cert.certificateType === "completion" ? "Course Completion" : "Participation"}
                />
                <InfoRow label="Course" value={cert.courseName} />
                <InfoRow label="Batch" value={cert.batchCode} />
                <InfoRow label="Issue Date" value={cert.issuedDate} />
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
