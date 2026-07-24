"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  enrollStudent, fetchAvailableBatches, fetchStudentsAction,
  fetchPartnersForEnrollment, fetchLanguageCandidatesAction,
} from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, User, BookOpen, Calculator, Loader2, Check,
  UserPlus, Info, Building2, Share2, ArrowLeft,
  CreditCard, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type EnrollmentMode = "portal-user" | "partner-sale" | "new-student" | "referral";

interface StudentResult {
  id: string; name?: string; fullName?: string;
  email: string; phone?: string; role?: string; sccgId?: string;
}

interface CandidateOption {
  id: string; sccgId: string; fullName: string;
  email: string; phone: string;
  partnerId: string; partnerName: string;
  paymentStatus: string; country: string;
}

interface BatchInfo {
  id: string; batchCode: string; batchName: string;
  courseId: string; courseName: string;
  courseFee: number; courseFeeCurrency?: string;
  teacherName: string; startDate: string; status: string;
}

interface PartnerOption { id: string; name: string; email: string; }

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function NewEnrollmentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>}>
      <EnrollmentForm />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────
// Mode meta
// ─────────────────────────────────────────────────────────────
const MODES: { key: EnrollmentMode; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { key: "portal-user",   label: "Existing User",       icon: User,      desc: "Already has a portal account",         color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "partner-sale",  label: "Partner Sale",        icon: Building2, desc: "Pick from partner's candidates",       color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "new-student",   label: "New Student",         icon: UserPlus,  desc: "Register new student with login",      color: "text-violet-600 bg-violet-50 border-violet-200" },
  { key: "referral",      label: "Individual Referral", icon: Share2,    desc: "Referred by a non-partner individual", color: "text-amber-600 bg-amber-50 border-amber-200" },
];

function currencySymbol(c?: string) { return c === "BDT" ? "৳" : "€"; }

// ─────────────────────────────────────────────────────────────
// Enrollment Form
// ─────────────────────────────────────────────────────────────
function EnrollmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<EnrollmentMode>("portal-user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Batches ───
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchInfo | null>(null);
  const [assignBatchLater, setAssignBatchLater] = useState(false);

  // ─── Portal-user search ───
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);

  // ─── Partner-sale ───
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [selectedPartnerName, setSelectedPartnerName] = useState("");
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateOption | null>(null);

  // ─── Shared student fields (new-student / referral) ───
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");

  // ─── Referral ───
  const [referrerName, setReferrerName] = useState("");
  const [referrerEmail, setReferrerEmail] = useState("");
  const [referrerCommission, setReferrerCommission] = useState("10");

  // ─── Fee ───
  const [totalFee, setTotalFee] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [discountReason, setDiscountReason] = useState("");

  const feeSymbol = currencySymbol(selectedBatch?.courseFeeCurrency);
  const netFee = Math.max(0, (parseFloat(totalFee) || 0) - (parseFloat(discountAmount) || 0));
  const referralCommissionAmt = mode === "referral" && netFee > 0
    ? Math.round(netFee * (parseFloat(referrerCommission) || 0) / 100) : 0;

  // ─── Load batches ───
  useEffect(() => {
    setLoadingBatches(true);
    fetchAvailableBatches()
      .then((b) => {
        setBatches(b);
        const urlBatchId = searchParams.get("batchId");
        if (urlBatchId) {
          const found = b.find((x: BatchInfo) => x.id === urlBatchId);
          if (found) { setSelectedBatch(found); setTotalFee(String(found.courseFee || "")); }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingBatches(false));
  }, [searchParams]);

  // ─── Load partners when mode = partner-sale ───
  useEffect(() => {
    if (mode === "partner-sale" && partners.length === 0) {
      fetchPartnersForEnrollment().then(setPartners).catch(console.error);
    }
  }, [mode, partners.length]);

  // ─── Load candidates when partner selected ───
  useEffect(() => {
    if (mode === "partner-sale" && selectedPartnerId) {
      setLoadingCandidates(true);
      setSelectedCandidate(null);
      setCandidateSearch("");
      fetchLanguageCandidatesAction(selectedPartnerId)
        .then(setCandidates)
        .catch(console.error)
        .finally(() => setLoadingCandidates(false));
    } else {
      setCandidates([]);
    }
  }, [mode, selectedPartnerId]);

  // ─── Auto-fill fee from selected batch (always override) ───
  useEffect(() => {
    if (selectedBatch) setTotalFee(String(selectedBatch.courseFee || ""));
    else if (!assignBatchLater) setTotalFee("");
  }, [selectedBatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Portal-user debounce search ───
  useEffect(() => {
    if (mode !== "portal-user") return;
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearchingStudents(true);
        try { setStudents(await fetchStudentsAction(searchQuery)); }
        catch (e) { console.error(e); }
        finally { setSearchingStudents(false); }
      } else { setStudents([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  // ─── Reset on mode change ───
  useEffect(() => {
    setSelectedStudent(null); setSearchQuery(""); setStudents([]);
    setSelectedPartnerId(""); setSelectedPartnerName("");
    setSelectedCandidate(null); setCandidates([]); setCandidateSearch("");
    setStudentName(""); setStudentEmail(""); setStudentPhone("");
    setReferrerName(""); setReferrerEmail(""); setReferrerCommission("10");
    setAssignBatchLater(mode === "partner-sale" || mode === "referral");
  }, [mode]);

  // ─── Submit ───
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "portal-user" && !selectedStudent) return setError("Please select a student");
    if (mode === "partner-sale" && !selectedPartnerId) return setError("Please select a partner");
    if (mode === "partner-sale" && !selectedCandidate) return setError("Please select a candidate");
    if ((mode === "new-student" || mode === "referral") && (!studentName || !studentEmail)) return setError("Student name and email are required");
    if (!assignBatchLater && !selectedBatch) return setError("Please select a batch — the fee will be set automatically");
    if (!assignBatchLater && !totalFee) return setError("Selected batch has no fee configured — contact admin");
    if (assignBatchLater && !totalFee) return setError("Please enter a course fee");

    setLoading(true);
    try {
      const isPortal = mode === "portal-user";
      const isPartner = mode === "partner-sale";

      await enrollStudent({
        enrollmentSource:
          isPortal ? "direct"
          : isPartner ? "partner"
          : mode === "new-student" ? "new-student"
          : "referral",
        isNewStudent: mode === "new-student",
        studentUserId: isPortal ? selectedStudent!.id : undefined,
        studentName: isPortal
          ? (selectedStudent!.name || selectedStudent!.fullName || "")
          : isPartner
          ? selectedCandidate!.fullName
          : studentName,
        studentEmail: isPortal ? selectedStudent!.email : isPartner ? selectedCandidate!.email : studentEmail,
        studentPhone: isPortal ? selectedStudent!.phone : isPartner ? selectedCandidate!.phone : studentPhone,
        partnerId: isPartner ? selectedPartnerId : undefined,
        partnerName: isPartner ? selectedPartnerName : undefined,
        referrerName: mode === "referral" ? referrerName : undefined,
        referrerEmail: mode === "referral" ? referrerEmail : undefined,
        referrerCommissionPercent: mode === "referral" ? parseFloat(referrerCommission) : undefined,
        batchId: assignBatchLater ? undefined : selectedBatch?.id,
        batchCode: assignBatchLater ? undefined : selectedBatch?.batchCode,
        courseId: assignBatchLater ? undefined : selectedBatch?.courseId,
        courseName: assignBatchLater ? undefined : selectedBatch?.courseName,
        totalFee: parseFloat(totalFee),
        discountAmount: parseFloat(discountAmount) || 0,
        discountReason: discountReason || undefined,
      });

      router.push("/admin/school/enrollments");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  const currentMode = MODES.find((m) => m.key === mode)!;

  // Filtered candidates list
  const filteredCandidates = candidates.filter((c) => {
    if (!candidateSearch) return true;
    const s = candidateSearch.toLowerCase();
    return c.fullName.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.sccgId.toLowerCase().includes(s);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 pb-24 px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">New Enrollment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Choose how this student is joining the school</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Mode Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.key;
          return (
            <button key={m.key} type="button" onClick={() => setMode(m.key)}
              className={`p-4 rounded-[24px] border-2 text-left transition-all ${
                active ? m.color + " border-current shadow-lg scale-[1.02]" : "bg-white border-gray-100 hover:border-gray-200 text-gray-600"
              }`}>
              <Icon className={`h-5 w-5 mb-2 ${active ? "" : "text-gray-400"}`} />
              <p className="font-black text-sm">{m.label}</p>
              <p className="text-[10px] font-medium mt-0.5 opacity-70 leading-tight">{m.desc}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* ── Student Section ── */}
            <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-8 py-5">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <currentMode.icon className="h-4 w-4 text-primary" />
                  Student Information
                  <Badge variant="outline" className="ml-auto text-[10px] font-bold capitalize">{currentMode.label}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-5">

                {/* ─── Portal User: search existing accounts ─── */}
                {mode === "portal-user" && !selectedStudent && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Search by name, email or SCCG ID… (min 2 chars)"
                        className="pl-12 h-14 rounded-2xl bg-gray-50/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {searchQuery.length > 0 && searchQuery.length < 2 && (
                      <p className="text-xs text-muted-foreground px-1">Type at least 2 characters to search</p>
                    )}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {searchingStudents ? (
                        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
                      ) : students.length > 0 ? students.map((s) => (
                        <div key={s.id} onClick={() => setSelectedStudent(s)}
                          className="flex items-center gap-4 p-4 rounded-[18px] border border-gray-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                            {(s.name || s.fullName || "U")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{s.name || s.fullName}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                          {s.role && <Badge variant="outline" className="text-[10px] capitalize">{s.role}</Badge>}
                          {s.sccgId && <span className="text-[10px] font-mono text-gray-400">{s.sccgId}</span>}
                        </div>
                      )) : searchQuery.length >= 2 && !searchingStudents && (
                        <p className="text-sm text-muted-foreground text-center py-6">No users found for "{searchQuery}"</p>
                      )}
                    </div>
                  </div>
                )}

                {mode === "portal-user" && selectedStudent && (
                  <div className="flex items-center justify-between p-6 rounded-[22px] bg-indigo-50 border border-indigo-100">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-[18px] bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg">
                        {(selectedStudent.name || selectedStudent.fullName || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-indigo-900">{selectedStudent.name || selectedStudent.fullName}</p>
                        <p className="text-sm text-indigo-600">{selectedStudent.email}</p>
                        {selectedStudent.sccgId && <p className="text-[10px] font-mono text-indigo-400">{selectedStudent.sccgId}</p>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedStudent(null)}>Change</Button>
                  </div>
                )}

                {/* ─── Partner Sale: partner picker → candidate list ─── */}
                {mode === "partner-sale" && (
                  <div className="space-y-5">
                    {/* Partner selector */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Select Partner *
                      </Label>
                      <select
                        className="w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 outline-none"
                        value={selectedPartnerId}
                        onChange={(e) => {
                          setSelectedPartnerId(e.target.value);
                          const p = partners.find((x) => x.id === e.target.value);
                          setSelectedPartnerName(p?.name || "");
                        }}
                      >
                        <option value="">— Select a partner —</option>
                        {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {/* Candidate list (loaded after partner is selected) */}
                    {selectedPartnerId && !selectedCandidate && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {selectedPartnerName}&apos;s Language Course Candidates
                          </Label>
                          {candidates.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{candidates.length} found</span>
                          )}
                        </div>
                        {loadingCandidates ? (
                          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
                        ) : candidates.length > 0 ? (
                          <>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input placeholder="Filter candidates…" value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)}
                                className="pl-9 h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {filteredCandidates.map((c) => (
                                <div key={c.id} onClick={() => setSelectedCandidate(c)}
                                  className="flex items-center gap-4 p-4 rounded-[18px] border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all">
                                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">
                                    {c.fullName[0]?.toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{c.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{c.email}</p>
                                    {c.phone && <p className="text-[10px] text-gray-400">{c.phone}</p>}
                                  </div>
                                  <div className="text-right space-y-1">
                                    {c.sccgId && <p className="text-[10px] font-mono text-gray-400">{c.sccgId}</p>}
                                    <Badge variant="outline" className={`text-[9px] font-bold ${c.paymentStatus === "paid" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                      {c.paymentStatus}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                              {filteredCandidates.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-6">No candidates match "{candidateSearch}"</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                            No language course candidates found for this partner.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected candidate card */}
                    {selectedCandidate && (
                      <div className="p-5 rounded-[22px] bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-[18px] bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg">
                            {selectedCandidate.fullName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-emerald-900">{selectedCandidate.fullName}</p>
                            <p className="text-sm text-emerald-700">{selectedCandidate.email}</p>
                            {selectedCandidate.phone && <p className="text-xs text-emerald-600">{selectedCandidate.phone}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              {selectedCandidate.sccgId && <span className="text-[10px] font-mono text-emerald-500">{selectedCandidate.sccgId}</span>}
                              <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0">{selectedCandidate.paymentStatus}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedCandidate(null)}>Change</Button>
                      </div>
                    )}

                    <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-700 font-medium flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      Partner has already collected payment from student. Set batch and confirm the enrollment fee below.
                    </div>
                  </div>
                )}

                {/* ─── New Student ─── */}
                {mode === "new-student" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-100 text-xs text-violet-700 font-medium flex items-start gap-2">
                      <UserPlus className="h-4 w-4 mt-0.5 shrink-0" />
                      A portal account will be created and login credentials emailed to the student automatically.
                    </div>
                    <StudentFields name={studentName} setName={setStudentName}
                      email={studentEmail} setEmail={setStudentEmail}
                      phone={studentPhone} setPhone={setStudentPhone} />
                  </div>
                )}

                {/* ─── Referral ─── */}
                {mode === "referral" && (
                  <div className="space-y-5">
                    <StudentFields name={studentName} setName={setStudentName}
                      email={studentEmail} setEmail={setStudentEmail}
                      phone={studentPhone} setPhone={setStudentPhone} />
                    <div className="border-t border-dashed border-gray-200 pt-5">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <Share2 className="h-3.5 w-3.5" /> Referrer Details
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5 md:col-span-1">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Referrer Name *</Label>
                          <Input value={referrerName} onChange={(e) => setReferrerName(e.target.value)} placeholder="Full name" className="rounded-xl h-11" />
                        </div>
                        <div className="space-y-1.5 md:col-span-1">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Referrer Email *</Label>
                          <Input type="email" value={referrerEmail} onChange={(e) => setReferrerEmail(e.target.value)} placeholder="email@example.com" className="rounded-xl h-11" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Commission %</Label>
                          <Input type="number" min={0} max={50} value={referrerCommission} onChange={(e) => setReferrerCommission(e.target.value)} placeholder="10" className="rounded-xl h-11" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* ── Batch Section ── */}
            <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-8 py-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />Class Batch
                  </CardTitle>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={assignBatchLater}
                      onChange={(e) => { setAssignBatchLater(e.target.checked); if (e.target.checked) setSelectedBatch(null); }}
                      className="rounded accent-primary" />
                    <span className="text-xs font-bold text-muted-foreground">Assign Later</span>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </label>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {assignBatchLater ? (
                  <div className="py-6 text-center text-sm text-muted-foreground font-medium rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                    <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    Batch assigned after enrollment. Status will be <strong>Applied</strong> until assigned.
                  </div>
                ) : loadingBatches ? (
                  <div className="py-10 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary/40" /></div>
                ) : batches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {batches.map((b) => {
                      const active = selectedBatch?.id === b.id;
                      const sym = currencySymbol(b.courseFeeCurrency);
                      return (
                        <div key={b.id} onClick={() => setSelectedBatch(b)}
                          className={`p-5 rounded-[22px] border-2 cursor-pointer transition-all ${active ? "bg-primary border-primary text-white shadow-xl shadow-primary/25" : "bg-white border-gray-100 hover:border-primary/30"}`}>
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant={active ? "secondary" : "outline"} className={`font-mono text-[10px] rounded-lg ${active ? "bg-white/20 text-white border-white/30" : ""}`}>{b.batchCode}</Badge>
                            <Badge variant={active ? "secondary" : "outline"} className={`text-[10px] capitalize ${active ? "bg-white/20 text-white border-white/30" : ""}`}>{b.status}</Badge>
                          </div>
                          <p className={`font-black text-sm truncate ${active ? "text-white" : "text-gray-800"}`}>{b.batchName}</p>
                          <p className={`text-xs mt-1 font-bold ${active ? "text-white/70" : "text-gray-400"}`}>{b.teacherName}</p>
                          <div className={`mt-3 pt-3 border-t flex justify-between items-center ${active ? "border-white/20" : "border-gray-50"}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-white/60" : "text-gray-400"}`}>
                              {new Date(b.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                            <span className={`font-black text-sm ${active ? "text-white" : "text-primary"}`}>
                              {sym}{b.courseFee?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">No active batches available.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Right col: fee + submit ─── */}
          <div className="space-y-6">
            <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl sticky top-6">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> Fee Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Course fee — auto-filled from batch, read-only; editable only when Assign Later */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Course Fee {assignBatchLater ? `(${feeSymbol})` : ""}
                  </Label>
                  {assignBatchLater ? (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{feeSymbol}</span>
                      <Input type="number" className="pl-8 h-12 rounded-xl font-black text-lg" value={totalFee}
                        onChange={(e) => setTotalFee(e.target.value)} placeholder="Enter fee" />
                    </div>
                  ) : (
                    <div className={`flex items-center gap-3 px-5 h-14 rounded-2xl border-2 font-black text-2xl ${
                      totalFee && parseFloat(totalFee) > 0
                        ? "border-primary/20 bg-primary/5 text-primary"
                        : "border-gray-100 bg-gray-50 text-gray-300"
                    }`}>
                      <span className="text-base font-bold opacity-60">{feeSymbol}</span>
                      <span>{totalFee && parseFloat(totalFee) > 0 ? parseFloat(totalFee).toLocaleString() : "—"}</span>
                      {!totalFee && <span className="text-xs font-medium text-muted-foreground ml-auto">Select a batch above</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Discount ({feeSymbol})</Label>
                  <Input type="number" className="h-12 rounded-xl" value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)} />
                </div>

                {parseFloat(discountAmount) > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Discount Reason</Label>
                    <Input className="h-11 rounded-xl" value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)} placeholder="Merit / Early Bird…" />
                  </div>
                )}

                <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  mode === "partner-sale" ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : mode === "referral" ? "bg-amber-50 border-amber-100 text-amber-700"
                  : "bg-indigo-50 border-indigo-100 text-indigo-700"
                }`}>
                  <CreditCard className="h-3.5 w-3.5" />
                  {mode === "partner-sale" ? "Payment collected by partner" : mode === "referral" ? "Direct payment (referral)" : "Direct payment"}
                </div>

                {mode === "referral" && netFee > 0 && parseFloat(referrerCommission) > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> Referral commission</span>
                    <span>{feeSymbol}{referralCommissionAmt.toLocaleString()} ({referrerCommission}%)</span>
                  </div>
                )}

                <div className="border-t border-dashed pt-4">
                  <div className="flex justify-between items-end mb-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Net Fee</span>
                    <span className="text-3xl font-black text-primary">{feeSymbol}{netFee.toLocaleString()}</span>
                  </div>

                  {mode === "partner-sale" && (
                    <div className="mb-4 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Payment confirmed by partner — mark enrollment as paid
                    </div>
                  )}

                  <Button type="submit" className="w-full h-14 rounded-[22px] font-black text-base shadow-2xl shadow-primary/25 hover:scale-[1.02] transition-transform active:scale-95" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5 mr-2" /> Confirm Enrollment</>}
                  </Button>

                  {mode === "new-student" && (
                    <p className="text-[10px] text-center text-muted-foreground mt-3 leading-relaxed">Login credentials will be emailed to the student automatically.</p>
                  )}
                  {mode === "referral" && (
                    <p className="text-[10px] text-center text-muted-foreground mt-3 leading-relaxed">Referral commission tracked as pending, paid manually after collection.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedBatch && !assignBatchLater && (
              <div className="p-5 rounded-[22px] bg-white shadow-xl border border-gray-100 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Batch</p>
                  <p className="font-black text-sm text-gray-800">{selectedBatch.courseName}</p>
                  <p className="text-xs font-bold text-primary">{selectedBatch.batchCode}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable student fields
// ─────────────────────────────────────────────────────────────
function StudentFields({ name, setName, email, setEmail, phone, setPhone }: {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student full name" className="rounded-xl h-12" required />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" className="rounded-xl h-12" required />
      </div>
      <div className="md:col-span-2 space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880…" className="rounded-xl h-12" />
      </div>
    </div>
  );
}
