"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchMyEnrollment,
  fetchMyBatchInfo,
  fetchMyCourseContent,
  fetchMyAttendance,
  fetchMyResults,
} from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, FileText, CheckCircle } from "lucide-react";
import type { SchoolEnrollment, SchoolBatch, SchoolContent, SchoolAttendance, SchoolExamResult } from "@/types";

type Tab = "overview" | "content" | "attendance" | "results";

export default function EnrollmentDetailPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<SchoolEnrollment | null>(null);
  const [batch, setBatch] = useState<SchoolBatch | null>(null);
  const [content, setContent] = useState<SchoolContent[]>([]);
  const [attendance, setAttendance] = useState<SchoolAttendance[]>([]);
  const [results, setResults] = useState<SchoolExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => { params.then(({ enrollmentId: id }) => setEnrollmentId(id)); }, [params]);

  const load = useCallback(async () => {
    if (!enrollmentId) return;
    setLoading(true);
    try {
      const enr = await fetchMyEnrollment(enrollmentId);
      setEnrollment(enr);
      const [b, c, a, r] = await Promise.all([
        fetchMyBatchInfo(enr.batchId),
        fetchMyCourseContent(enr.courseId, enr.batchId),
        fetchMyAttendance(enr.batchId),
        fetchMyResults(enr.batchId),
      ]);
      setBatch(b);
      setContent(c);
      setAttendance(a);
      setResults(r);
    } finally { setLoading(false); }
  }, [enrollmentId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !enrollment) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const attendancePercent = attendance.length > 0 ? Math.round((presentCount / new Set(attendance.map((a) => a.sessionNumber)).size || 1) * 100) : 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BookOpen className="h-4 w-4" /> },
    { id: "content", label: "Materials", icon: <FileText className="h-4 w-4" /> },
    { id: "attendance", label: "Attendance", icon: <Calendar className="h-4 w-4" /> },
    { id: "results", label: "Results", icon: <CheckCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customer/school" className="p-2 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{enrollment.courseName}</h1>
          <p className="text-sm text-muted-foreground">{enrollment.batchCode}</p>
        </div>
        <Badge variant={enrollment.status === "enrolled" ? "default" : "secondary"} className="capitalize">{enrollment.status}</Badge>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Course Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Course</span><span className="font-medium">{enrollment.courseName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Batch</span><span className="font-medium font-mono">{enrollment.batchCode}</span></div>
              {batch && <>
                <div className="flex justify-between"><span className="text-muted-foreground">Teacher</span><span className="font-medium">{batch.teacherName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium">{batch.schedule}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{batch.startDate} → {batch.endDate}</span></div>
              </>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payment &amp; Progress</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Fee</span><span className="font-medium">৳{enrollment.totalFee.toLocaleString()}</span></div>
              {enrollment.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-medium text-green-600">-৳{enrollment.discountAmount.toLocaleString()}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Net Fee</span><span className="font-bold">৳{enrollment.netFee.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><Badge variant={enrollment.paymentStatus === "paid" ? "default" : "secondary"} className="capitalize text-xs">{enrollment.paymentStatus}</Badge></div>
              <div className="pt-2 border-t flex justify-between"><span className="text-muted-foreground">Attendance</span><span className="font-medium">{attendancePercent}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Results</span><span className="font-medium">{results.length} exam(s)</span></div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "content" && (
        <Card>
          <CardHeader><CardTitle>Course Materials ({content.length})</CardTitle></CardHeader>
          <CardContent>
            {content.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No materials available yet</p>
            ) : (
              <div className="space-y-2">
                {content.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.contentType} {c.sessionNumber ? `• Session ${c.sessionNumber}` : ""}</p>
                    </div>
                    {(c.fileUrl || c.externalUrl) && (
                      <a href={c.fileUrl || c.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open →</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "attendance" && (
        <Card>
          <CardHeader><CardTitle>My Attendance ({attendance.length} records)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Session</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Date</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-4 text-muted-foreground">No attendance records yet</td></tr>
                ) : (
                  attendance.map((a, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-4">Session {a.sessionNumber}</td>
                      <td className="py-2 px-4">{a.sessionDate}</td>
                      <td className="py-2 px-4">
                        <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"} className="capitalize text-xs">{a.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "results" && (
        <Card>
          <CardHeader><CardTitle>My Results ({results.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Exam</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Score</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">%</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Grade</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground">Result</th>
              </tr></thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No published results yet</td></tr>
                ) : (
                  results.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 px-4 capitalize">{r.examName || r.examType}</td>
                      <td className="py-2 px-4">{r.obtainedScore}/{r.maxScore}</td>
                      <td className="py-2 px-4">{r.percentage}%</td>
                      <td className="py-2 px-4 font-bold">{r.grade}</td>
                      <td className="py-2 px-4">
                        <Badge variant={r.isPassed ? "default" : "destructive"} className="text-xs">{r.isPassed ? "Passed" : "Failed"}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
