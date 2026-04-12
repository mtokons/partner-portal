"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchBatchById,
  fetchEnrollments,
  fetchAttendance,
  fetchExamResults,
  fetchContent,
  updateBatchStatus,
  submitAttendance,
  enterExamResult,
  publishResults,
  getCertificateEligibility,
  issueCertificate,
} from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, Clock, BookOpen, FileText, Award, CheckCircle } from "lucide-react";
import type { SchoolBatch, SchoolEnrollment, SchoolAttendance, SchoolExamResult, SchoolContent } from "@/types";

type TabId = "students" | "attendance" | "results" | "content" | "certificates";

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batch, setBatch] = useState<SchoolBatch | null>(null);
  const [enrollments, setEnrollments] = useState<SchoolEnrollment[]>([]);
  const [attendance, setAttendance] = useState<SchoolAttendance[]>([]);
  const [results, setResults] = useState<SchoolExamResult[]>([]);
  const [content, setContent] = useState<SchoolContent[]>([]);
  const [tab, setTab] = useState<TabId>("students");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // Attendance
  const [attendSession, setAttendSession] = useState("");
  const [attendDate, setAttendDate] = useState("");
  const [attendRecords, setAttendRecords] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  // Results
  const [resultStudent, setResultStudent] = useState<string | null>(null);
  const [resultExamType, setResultExamType] = useState<"midterm" | "final" | "quiz" | "assignment">("midterm");
  const [resultMaxScore, setResultMaxScore] = useState("100");
  const [resultObtained, setResultObtained] = useState("");

  useEffect(() => {
    params.then(({ id }) => setBatchId(id));
  }, [params]);

  const loadData = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [b, enr, att, res, cnt] = await Promise.all([
        fetchBatchById(batchId),
        fetchEnrollments({ batchId }),
        fetchAttendance(batchId),
        fetchExamResults({ batchId }),
        fetchContent({ batchId }),
      ]);
      setBatch(b);
      setEnrollments(enr);
      setAttendance(att);
      setResults(res);
      setContent(cnt);
      // Initialize attendance records
      const records: Record<string, "present" | "absent" | "late" | "excused"> = {};
      enr.forEach((e) => { records[e.studentUserId] = "present"; });
      setAttendRecords(records);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading || !batch) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "students", label: "Students", icon: <Users className="h-4 w-4" /> },
    { id: "attendance", label: "Attendance", icon: <Calendar className="h-4 w-4" /> },
    { id: "results", label: "Results", icon: <FileText className="h-4 w-4" /> },
    { id: "content", label: "Content", icon: <BookOpen className="h-4 w-4" /> },
    { id: "certificates", label: "Certificates", icon: <Award className="h-4 w-4" /> },
  ];

  async function handleStatusChange(status: "active" | "completed" | "cancelled") {
    setActionLoading(true);
    try {
      await updateBatchStatus(batchId!, status);
      await loadData();
    } finally { setActionLoading(false); }
  }

  async function handleSubmitAttendance() {
    if (!attendSession || !attendDate) return;
    setActionLoading(true);
    try {
      const records = enrollments
        .filter((e) => e.status === "enrolled" || e.status === "completed")
        .map((e) => ({
          studentUserId: e.studentUserId,
          studentName: e.studentName,
          status: attendRecords[e.studentUserId] || ("present" as const),
        }));
      await submitAttendance(batchId!, parseInt(attendSession), attendDate, records);
      await loadData();
      setAttendSession("");
      setAttendDate("");
    } finally { setActionLoading(false); }
  }

  async function handleEnterResult() {
    if (!resultStudent || !resultObtained) return;
    const enrollment = enrollments.find((e) => e.studentUserId === resultStudent);
    if (!enrollment) return;
    setActionLoading(true);
    try {
      await enterExamResult({
        batchId: batchId!,
        courseId: batch!.courseId,
        studentUserId: resultStudent,
        studentName: enrollment.studentName,
        enrollmentId: enrollment.id,
        examType: resultExamType,
        examName: `${resultExamType.charAt(0).toUpperCase() + resultExamType.slice(1)} Exam`,
        examDate: new Date().toISOString().split("T")[0],
        maxScore: parseInt(resultMaxScore),
        obtainedScore: parseInt(resultObtained),
      });
      await loadData();
      setResultObtained("");
    } finally { setActionLoading(false); }
  }

  async function handlePublishResults() {
    setActionLoading(true);
    try {
      await publishResults(batchId!, resultExamType);
      await loadData();
    } finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/school/batches" className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{batch.batchName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{batch.batchCode} — {batch.courseName}</p>
        </div>
        <Badge variant={batch.status === "active" ? "default" : "secondary"} className="capitalize">{batch.status}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" /> Students</div>
          <p className="font-semibold text-lg">{batch.enrolledStudents}/{batch.maxStudents}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Calendar className="h-3.5 w-3.5" /> Period</div>
          <p className="font-semibold text-sm">{batch.startDate} → {batch.endDate}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-3.5 w-3.5" /> Schedule</div>
          <p className="font-semibold text-sm">{batch.schedule}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" /> Teacher</div>
          <p className="font-semibold text-sm">{batch.teacherName}</p>
        </CardContent></Card>
      </div>

      {batch.status === "planned" && (
        <div className="flex gap-2">
          <button onClick={() => handleStatusChange("active")} disabled={actionLoading}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            Start Batch
          </button>
          <button onClick={() => handleStatusChange("cancelled")} disabled={actionLoading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            Cancel
          </button>
        </div>
      )}
      {batch.status === "active" && (
        <button onClick={() => handleStatusChange("completed")} disabled={actionLoading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          Mark Completed
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {tab === "students" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Enrolled Students ({enrollments.length})</CardTitle>
            <Link href={`/admin/school/enrollments/new?batchId=${batchId}&batchCode=${batch.batchCode}&courseId=${batch.courseId}&courseName=${encodeURIComponent(batch.courseName)}`}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
              + Enroll Student
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Name</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Email</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Net Fee</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Payment</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-4 font-medium">{e.studentName}</td>
                    <td className="py-2 px-4 text-muted-foreground">{e.studentEmail}</td>
                    <td className="py-2 px-4">৳{e.netFee.toLocaleString()}</td>
                    <td className="py-2 px-4"><Badge variant={e.paymentStatus === "paid" ? "default" : "secondary"} className="capitalize text-xs">{e.paymentStatus}</Badge></td>
                    <td className="py-2 px-4"><Badge variant={e.status === "enrolled" ? "default" : "secondary"} className="capitalize text-xs">{e.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Attendance Tab */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Record Attendance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Session #</label>
                  <Input type="number" value={attendSession} onChange={(e) => setAttendSession(e.target.value)} min={1} placeholder="1" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input type="date" value={attendDate} onChange={(e) => setAttendDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                {enrollments.filter((e) => e.status === "enrolled").map((e) => (
                  <div key={e.studentUserId} className="flex items-center justify-between border rounded px-3 py-2">
                    <span className="text-sm font-medium">{e.studentName}</span>
                    <Select value={attendRecords[e.studentUserId] || "present"}
                      onValueChange={(v) => setAttendRecords((prev) => ({ ...prev, [e.studentUserId]: v as "present" | "absent" | "late" | "excused" }))}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="excused">Excused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitAttendance} disabled={actionLoading || !attendSession || !attendDate}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {actionLoading ? "Saving..." : "Save Attendance"}
              </button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Attendance Records ({attendance.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Session</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Date</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Student</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {attendance.slice(0, 50).map((a, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-4">{a.sessionNumber}</td>
                      <td className="py-2 px-4">{a.sessionDate}</td>
                      <td className="py-2 px-4">{a.studentName}</td>
                      <td className="py-2 px-4">
                        <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"} className="capitalize text-xs">{a.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Tab */}
      {tab === "results" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Enter Result</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Student</label>
                  <Select value={resultStudent || ""} onValueChange={(v) => setResultStudent(v)}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {enrollments.map((e) => (
                        <SelectItem key={e.studentUserId} value={e.studentUserId}>{e.studentName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Exam Type</label>
                  <Select value={resultExamType} onValueChange={(v) => v && setResultExamType(v as typeof resultExamType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="midterm">Midterm</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Max Score</label>
                  <Input value={resultMaxScore} onChange={(e) => setResultMaxScore(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Obtained</label>
                  <Input value={resultObtained} onChange={(e) => setResultObtained(e.target.value)} type="number" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleEnterResult} disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {actionLoading ? "Saving..." : "Save Result"}
                </button>
                <button onClick={handlePublishResults} disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  Publish {resultExamType} Results
                </button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Exam Results ({results.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Student</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Exam</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Score</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">%</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Grade</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 px-4">{r.studentName}</td>
                      <td className="py-2 px-4 capitalize">{r.examType}</td>
                      <td className="py-2 px-4">{r.obtainedScore}/{r.maxScore}</td>
                      <td className="py-2 px-4">{r.percentage}%</td>
                      <td className="py-2 px-4 font-bold">{r.grade}</td>
                      <td className="py-2 px-4">
                        <Badge variant={r.status === "published" ? "default" : "secondary"} className="capitalize text-xs">{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Tab */}
      {tab === "content" && (
        <Card>
          <CardHeader><CardTitle>Course Content ({content.length})</CardTitle></CardHeader>
          <CardContent>
            {content.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No content uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {content.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.contentType} • Session {c.sessionNumber || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.isPublished && <CheckCircle className="h-4 w-4 text-green-500" />}
                      <Badge variant={c.isPublished ? "default" : "secondary"} className="text-xs">
                        {c.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certificates Tab */}
      {tab === "certificates" && <CertificatesPanel batchId={batchId!} batch={batch} actionLoading={actionLoading} setActionLoading={setActionLoading} onRefresh={loadData} />}
    </div>
  );
}

function CertificatesPanel({ batchId, batch, actionLoading, setActionLoading, onRefresh }: {
  batchId: string; batch: SchoolBatch; actionLoading: boolean; setActionLoading: (v: boolean) => void; onRefresh: () => void;
}) {
  const [eligibility, setEligibility] = useState<Awaited<ReturnType<typeof getCertificateEligibility>> | null>(null);
  const [loadingElig, setLoadingElig] = useState(false);

  async function checkEligibility() {
    setLoadingElig(true);
    try {
      const result = await getCertificateEligibility(batchId);
      setEligibility(result);
    } finally { setLoadingElig(false); }
  }

  async function handleIssue(item: NonNullable<typeof eligibility>[number], certType: "participation" | "completion") {
    setActionLoading(true);
    try {
      await issueCertificate({
        certificateType: certType,
        studentUserId: item.enrollment.studentUserId,
        studentName: item.enrollment.studentName,
        studentSccgId: "", // Would come from user profile
        enrollmentId: item.enrollment.id,
        courseId: item.enrollment.courseId,
        courseName: item.enrollment.courseName,
        courseLevel: "",
        batchId,
        batchCode: batch.batchCode,
        attendancePercentage: item.attendancePercent,
        finalGrade: item.finalGrade || undefined,
        examScore: item.examScore || undefined,
      });
      await checkEligibility();
      onRefresh();
    } finally { setActionLoading(false); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Certificate Eligibility</CardTitle>
        <button onClick={checkEligibility} disabled={loadingElig}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {loadingElig ? "Checking..." : "Check Eligibility"}
        </button>
      </CardHeader>
      <CardContent>
        {!eligibility ? (
          <p className="text-sm text-muted-foreground text-center py-4">Click &quot;Check Eligibility&quot; to see which students qualify</p>
        ) : eligibility.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No completed students found</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-3 text-xs text-muted-foreground">Student</th>
              <th className="text-left py-2 px-3 text-xs text-muted-foreground">Attendance</th>
              <th className="text-left py-2 px-3 text-xs text-muted-foreground">Grade</th>
              <th className="text-left py-2 px-3 text-xs text-muted-foreground">Participation</th>
              <th className="text-left py-2 px-3 text-xs text-muted-foreground">Completion</th>
              <th className="text-left py-2 px-3 text-xs text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {eligibility.map((item) => (
                <tr key={item.enrollment.id} className="border-b">
                  <td className="py-2 px-3 font-medium">{item.enrollment.studentName}</td>
                  <td className="py-2 px-3">{item.attendancePercent}%</td>
                  <td className="py-2 px-3 font-bold">{item.finalGrade || "—"}</td>
                  <td className="py-2 px-3">
                    <Badge variant={item.eligibleParticipation ? "default" : "destructive"} className="text-xs">
                      {item.eligibleParticipation ? "Eligible" : "Not eligible"}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant={item.eligibleCompletion ? "default" : "destructive"} className="text-xs">
                      {item.eligibleCompletion ? "Eligible" : "Not eligible"}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      {item.eligibleParticipation && (
                        <button onClick={() => handleIssue(item, "participation")} disabled={actionLoading}
                          className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                          Participation
                        </button>
                      )}
                      {item.eligibleCompletion && (
                        <button onClick={() => handleIssue(item, "completion")} disabled={actionLoading}
                          className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                          Completion
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
