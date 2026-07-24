import { headers } from "next/headers";
import { getSchoolCertificates } from "@/lib/firestore-services";
import { getCertificateByCode, getB2BCompanyByCertCode } from "@/lib/sharepoint";
import { Badge } from "@/components/ui/badge";
import { Award, ShieldCheck, ShieldX, ShieldAlert, User, BookOpen, Calendar, Hash, GraduationCap, Building2, CheckCircle2, Clock, Star, Handshake, MapPin, Briefcase } from "lucide-react";

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

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const h = await headers();
  const ip = clientIp(h);

  const formatOk = CODE_FORMAT.test(code);
  const rateOk = checkRate(ip);

  let cert = null;
  let coopCert = null;
  if (formatOk && rateOk) {
    if (code.startsWith("COOP-")) {
      // B2B Cooperation Certificate
      try {
        coopCert = await getB2BCompanyByCertCode(code);
      } catch { /* not found */ }
    } else {
      // School / Language certificate
      try {
        const results = await getSchoolCertificates({ verificationCode: code });
        cert = results[0] || null;
        if (!cert) {
          cert = await getCertificateByCode(code);
        }
      } catch {
        try {
          cert = await getCertificateByCode(code);
        } catch {
          // both lookups failed — treat as not found
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/sccg-logo.png" alt="SCCG Logo" className="h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Certificate Verification</h1>
          <p className="text-sm text-slate-500">
            {code.startsWith("COOP-") ? "SCCG Career Lab UG · Partner Network" : "SCCG Career Lab UG · Language School"}
          </p>
          <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-mono text-slate-600">
            <Hash className="h-3 w-3" />
            {code}
          </div>
        </div>

        {!rateOk ? (
          <StatusCard
            icon={<ShieldAlert className="h-12 w-12 text-amber-400" />}
            color="amber"
            title="Too Many Requests"
            message="Please wait a minute and try again."
          />
        ) : !formatOk || (!cert && !coopCert) ? (
          <StatusCard
            icon={<ShieldAlert className="h-12 w-12 text-red-400" />}
            color="red"
            title="Certificate Not Found"
            message="No certificate matches this verification code. It may be invalid or the certificate does not exist."
          />
        ) : coopCert ? (
          /* ── Partnership / Cooperation Certificate ─────────────────────────── */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-8 text-center text-white relative overflow-hidden">
              <div className="relative">
                <div className="flex justify-center mb-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20">
                    <Handshake className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white">Certificate of Cooperation</h2>
                <p className="text-slate-300 text-sm mt-1">SCCG Career Lab Partner Network</p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> PARTNERSHIP VERIFIED
                </div>
              </div>
            </div>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Partnering Organisation</p>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  <Building2 className="h-7 w-7 text-slate-600" />
                </div>
                <div>
                  <p className="text-xl font-black text-slate-800">{coopCert.companyName}</p>
                  {(coopCert.city || coopCert.address) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <p className="text-sm text-slate-500">{coopCert.city || coopCert.address?.split(",").pop()?.trim()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Certificate Details</p>
              <div className="grid grid-cols-1 divide-y divide-slate-50">
                {coopCert.industry && (
                  <CertDetail icon={<Briefcase />} label="Industry" value={coopCert.industry} />
                )}
                <CertDetail icon={<Hash />} label="Certificate Number" value={coopCert.certCode || code} mono />
                <CertDetail icon={<Calendar />} label="Issue Date" value={formatDate(coopCert.certIssuedAt || coopCert.createdAt)} />
              </div>
            </div>
            <div className="mx-6 mb-6 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-slate-700 shrink-0" />
              <div>
                <p className="text-xs font-black text-slate-700">Issued by SCCG Career Lab UG</p>
                <p className="text-[11px] text-slate-500">This certificate was issued through the SCCG Career Lab Partner Network, Hamburg, Germany. Verifiable at portal.mysccg.de</p>
              </div>
            </div>
          </div>
        ) : cert?.status === "revoked" ? (
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-8 text-center text-white">
              <ShieldX className="h-14 w-14 mx-auto mb-3 opacity-90" />
              <h2 className="text-2xl font-black">Certificate Revoked</h2>
              <p className="text-red-100 text-sm mt-1">This certificate is no longer valid</p>
            </div>
            <div className="p-6 space-y-4">
              <CertDetail icon={<User />} label="Participant" value={cert!.studentName} highlight />
              <CertDetail icon={<BookOpen />} label="Course" value={cert!.courseName} />
              <CertDetail icon={<Hash />} label="Certificate Number" value={cert!.certificateNumber} mono />
              <CertDetail icon={<Calendar />} label="Issue Date" value={formatDate(cert!.issuedDate)} />
              {cert!.revokedAt && <CertDetail icon={<Clock />} label="Revoked On" value={formatDate(cert!.revokedAt!)} />}
              {cert!.revocationReason && <CertDetail icon={<ShieldX />} label="Reason" value={cert!.revocationReason!} />}
            </div>
          </div>
        ) : cert ? (
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden">
            {/* Green header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
              <div className="relative">
                <div className="flex justify-center mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <ShieldCheck className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-black">Authentic Certificate</h2>
                <p className="text-purple-200 text-sm mt-1">Verified by SCCG Language School</p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-green-400/30 border border-green-300/50 text-green-100 text-xs font-bold px-3 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> VERIFIED AUTHENTIC
                </div>
              </div>
            </div>

            {/* Participant highlight */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                  <User className="h-7 w-7 text-violet-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Participant</p>
                  <p className="text-xl font-black text-slate-800">{cert!.studentName}</p>
                  {cert!.studentSccgId && cert!.studentSccgId !== "MANUAL" && (
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{cert!.studentSccgId}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Certificate details grid */}
            <div className="p-6 space-y-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Certificate Details</p>

              <div className="grid grid-cols-1 divide-y divide-slate-50">
                <CertDetail icon={<Award />} label="Certificate Type"
                  value={cert!.certificateType === "completion" ? "Course Completion Certificate" : "Certificate of Participation"}
                  badgeColor={cert!.certificateType === "completion" ? "green" : "blue"}
                />
                <CertDetail icon={<BookOpen />} label="Course Name" value={cert!.courseName} highlight />
                {cert!.courseLevel && (
                  <CertDetail icon={<GraduationCap />} label="Language Level" value={cert!.courseLevel} />
                )}
                {cert!.batchCode && cert!.batchCode !== "MANUAL" && (
                  <CertDetail icon={<Building2 />} label="Batch / Class" value={cert!.batchCode} />
                )}
                {cert!.attendancePercentage > 0 && (
                  <CertDetail icon={<CheckCircle2 />} label="Attendance" value={`${cert!.attendancePercentage}%`} />
                )}
                {cert!.finalGrade && (
                  <CertDetail icon={<Star />} label="Final Grade" value={cert!.finalGrade} highlight />
                )}
                {cert!.examScore != null && cert!.examScore > 0 && (
                  <CertDetail icon={<Star />} label="Exam Score" value={`${cert!.examScore}`} />
                )}
                <CertDetail icon={<Calendar />} label="Issue Date" value={formatDate(cert!.issuedDate)} />
                {cert!.validUntil && (
                  <CertDetail icon={<Clock />} label="Valid Until" value={formatDate(cert!.validUntil)} />
                )}
                <CertDetail icon={<Hash />} label="Certificate Number" value={cert!.certificateNumber} mono />
                {cert!.issuedByName && (
                  <CertDetail icon={<User />} label="Issued By" value={cert!.issuedByName} />
                )}
              </div>
            </div>

            {/* Footer seal */}
            <div className="mx-6 mb-6 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 p-4 flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-violet-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-violet-700">Digitally Verified</p>
                <p className="text-[11px] text-slate-500">This certificate was issued by SCCG Career Lab UG (Haftungsbeschränkt), Hamburg and is verifiable at portal.mysccg.de</p>
              </div>
            </div>
          </div>
        ) : null}


        <p className="text-center text-xs text-slate-400">
          SCCG Career Lab UG · Julius-Ludowieg-Straße 46, 21073 Hamburg · portal.mysccg.de
        </p>
      </div>
    </div>
  );
}

function StatusCard({ icon, color, title, message }: { icon: React.ReactNode; color: "red" | "amber"; title: string; message: string }) {
  const colors = {
    red: "border-red-200 bg-red-50/50",
    amber: "border-amber-200 bg-amber-50/50",
  };
  return (
    <div className={`rounded-2xl border p-8 text-center ${colors[color]}`}>
      <div className="flex justify-center mb-4">{icon}</div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 mt-2">{message}</p>
    </div>
  );
}

function CertDetail({
  icon, label, value, highlight, mono, badgeColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  badgeColor?: "green" | "blue";
}) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        {badgeColor ? (
          <Badge
            className={badgeColor === "green"
              ? "bg-green-100 text-green-800 border-green-200 mt-0.5"
              : "bg-blue-100 text-blue-800 border-blue-200 mt-0.5"}
            variant="outline"
          >
            {value}
          </Badge>
        ) : (
          <p className={`text-sm font-semibold text-slate-800 truncate ${mono ? "font-mono tracking-wide" : ""} ${highlight ? "text-violet-700" : ""}`}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
