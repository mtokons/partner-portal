"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchTeacherBatch,
  fetchBatchStudents,
  fetchBatchAttendance,
  fetchBatchResults,
  fetchBatchContent,
  teacherRecordAttendance,
  teacherEnterResult,
  teacherUploadContent,
  teacherPublishContent,
} from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, FileText, BookOpen, CheckCircle } from "lucide-react";
import type { SchoolBatch, SchoolEnrollment, SchoolAttendance, SchoolExamResult, SchoolContent } from "@/types";

type Tab = "students" | "attendance" | "results" | "content";

export default function TeacherBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batch, setBatch] = useState<SchoolBatch | null>(null);
  const [students, setStudents] = useState<SchoolEnrollment[]>([]);
  const [attendance, setAttendance] = useState<SchoolAttendance[]>([]);
  const [results, setResults] = useState<SchoolExamResult[]>([]);
  const [content, setContent] = useState<SchoolContent[]>([]);
  const [tab, setTab] = useState<Tab>("students");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Attendance form
  const [sessionNum, setSessionNum] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [attendRecords, setAttendRecords] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});

  // Result form
  const [resStudent, setResStudent] = useState<string | null>(null);
  const [resExamType, setResExamType] = useState<"midterm" | "final" | "quiz" | "assignment">("midterm");
  const [resMax, setResMax] = useState("100");
  const [resObtained, setResObtained] = useState("");

  useEffect(() => { params.then(({ id }) => setBatchId(id)); }, [params]);

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [b, s, a, r, c] = await Promise.all([
        fetchTeacherBatch(batchId),
        fetchBatchStudents(batchId),
        fetchBatchAttendance(batchId),
        fetchBatchResults(batchId),
        fetchBatchContent(batchId),
      ]);
      setBatch(b);
      setStudents(s);
      setAttendance(a);
      setResults(r);
      setContent(c);
      const recs: Record<string, "present" | "absent" | "late" | "excused"> = {};
      s.forEach((e) => { recs[e.studentUserId] = "present"; });
      setAttendRecords(recs);
    } finally { setLoading(false); }
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !batch) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "students", label: "Students", icon: <Users className="h-4 w-4" /> },
    { id: "attendance", label: "Attendance", icon: <Calendar className="h-4 w-4" /> },
    { id: "results", label: "Results", icon: <FileText className="h-4 w-4" /> },
    { id: "content", label: "Content", icon: <BookOpen className="h-4 w-4" /> },
  ];

  async function handleAttendance() {
    if (!sessionNum || !sessionDate) return;
    setActionLoading(true);
    try {
      const recs = students
        .filter((s) => s.status === "enrolled")
        .map((s) => ({ studentUserId: s.studentUserId, studentName: s.studentName, status: attendRecords[s.studentUserId] || ("present" as const) }));
      await teacherRecordAttendance(batchId!, parseInt(sessionNum), sessionDate, recs);
      await load();
    } finally { setActionLoading(false); }
  }

  async function handleResult() {
    if (!resStudent || !resObtained) return;
    const student = students.find((s) => s.studentUserId === resStudent);
    if (!student) return;
    setActionLoading(true);
    try {
      await teacherEnterResult({
        batchId: batchId!,
        courseId: batch!.courseId,
        studentUserId: resStudent,
        studentName: student.studentName,
        enrollmentId: student.id,
        examType: resExamType,
        examName: `${resExamType.charAt(0).toUpperCase() + resExamType.slice(1)} Exam`,
        examDate: new Date().toISOString().split("T")[0],
        maxScore: parseInt(resMax),
        obtainedScore: parseInt(resObtained),
      });
      await load();
      setResObtained("");
    } finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/expert/teaching" className="p-2 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{batch.batchName}</h1>
          <p className="text-sm text-muted-foreground">{batch.courseName} • {batch.schedule}</p>
        </div>
        <Badge variant={batch.status === "active" ? "default" : "secondary"} className="capitalize">{batch.status}</Badge>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "students" && (
        <Card>
          <CardHeader><CardTitle>Students ({students.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Name</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Email</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 px-4 font-medium">{s.studentName}</td>
                    <td className="py-2 px-4 text-muted-foreground">{s.studentEmail}</td>
                    <td className="py-2 px-4"><Badge variant="default" className="capitalize text-xs">{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Record Attendance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" placeholder="Session #" value={sessionNum} onChange={(e) => setSessionNum(e.target.value)} />
                <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </div>
              {students.filter((s) => s.status === "enrolled").map((s) => (
                <div key={s.studentUserId} className="flex items-center justify-between border rounded px-3 py-2">
                  <span className="text-sm font-medium">{s.studentName}</span>
                  <Select value={attendRecords[s.studentUserId] || "present"}
                    onValueChange={(v) => setAttendRecords((p) => ({ ...p, [s.studentUserId]: v as "present" | "absent" | "late" | "excused" }))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <button onClick={handleAttendance} disabled={actionLoading || !sessionNum || !sessionDate}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {actionLoading ? "Saving..." : "Save Attendance"}
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "results" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Enter Result</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select value={resStudent || ""} onValueChange={(v) => setResStudent(v)}>
                  <SelectTrigger><SelectValue placeholder="Student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.studentUserId} value={s.studentUserId}>{s.studentName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={resExamType} onValueChange={(v) => v && setResExamType(v as typeof resExamType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Max" value={resMax} onChange={(e) => setResMax(e.target.value)} />
                <Input type="number" placeholder="Obtained" value={resObtained} onChange={(e) => setResObtained(e.target.value)} />
              </div>
              <button onClick={handleResult} disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {actionLoading ? "Saving..." : "Save Result"}
              </button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Results ({results.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Student</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Exam</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Score</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Grade</th>
                  <th className="text-left py-2 px-4 text-xs text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 px-4">{r.studentName}</td>
                      <td className="py-2 px-4 capitalize">{r.examType}</td>
                      <td className="py-2 px-4">{r.obtainedScore}/{r.maxScore} ({r.percentage}%)</td>
                      <td className="py-2 px-4 font-bold">{r.grade}</td>
                      <td className="py-2 px-4"><Badge variant={r.status === "published" ? "default" : "secondary"} className="text-xs capitalize">{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "content" && (
        <Card>
          <CardHeader><CardTitle>Content ({content.length})</CardTitle></CardHeader>
          <CardContent>
            {content.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No content uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {content.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.contentType} • Session {c.sessionNumber || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.isPublished && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {!c.isPublished && (
                        <button onClick={async () => { await teacherPublishContent(c.id); load(); }}
                          className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700">Publish</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
