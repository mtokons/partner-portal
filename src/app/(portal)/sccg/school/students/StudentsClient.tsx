"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Euro,
  GraduationCap,
  Hourglass,
  Layers,
  Mail,
  Phone,
  Plus,
  Search,
  User,
  Users,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";
import type {
  SchoolBatch,
  SchoolCertificate,
  SchoolCourse,
  SchoolEnrollment,
} from "@/types";
import {
  issueCertificateAction,
  markEnrollmentCompletedAction,
  registerStudentAction,
  updateEnrollmentPaymentStatusAction,
} from "../actions";

interface StudentsClientProps {
  initialEnrollments: SchoolEnrollment[];
  batches: SchoolBatch[];
  courses: SchoolCourse[];
  certificates: SchoolCertificate[];
}

export default function StudentsClient({
  initialEnrollments,
  batches,
  courses,
  certificates,
}: StudentsClientProps) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState<SchoolEnrollment | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<SchoolEnrollment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredStudents = enrollments.filter((e) => {
    const matchSearch =
      !search ||
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      (e.sccgId || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.batchCode || "").toLowerCase().includes(search.toLowerCase());

    const studentLevel = (e.desiredLevel || (e.courseName.match(/[A-C][1-2]/i) || ["A1"])[0]).toUpperCase();
    const matchLevel = levelFilter === "ALL" || studentLevel === levelFilter;
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;

    return matchSearch && matchLevel && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C81] uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> Student Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Central Student Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage registrations, CEFR proficiency levels, cohort assignments, and student profiles.
          </p>
        </div>

        <button
          onClick={() => { setError(null); setShowRegisterModal(true); }}
          className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0D3F6D] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Register Student
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "A1", "A2", "B1", "B2", "C1"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                levelFilter === lvl
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {lvl === "ALL" ? "All Levels" : `🇩🇪 ${lvl}`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border bg-background text-xs font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="enrolled">Enrolled in Batch</option>
            <option value="waiting-list">On Waiting List</option>
            <option value="completed">Graduated / Completed</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, ID..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── Students Table ── */}
      <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border/60">
              <tr>
                <th className="py-3.5 px-4">Student Details</th>
                <th className="py-3.5 px-4">German Level</th>
                <th className="py-3.5 px-4">Assigned Batch</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No students match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((e) => {
                  const studentLevel = (e.desiredLevel || "A1").toUpperCase();
                  const isPaid = e.paymentStatus === "paid";
                  const cert = certificates.find((c) => c.enrollmentId === e.id && c.status === "issued");

                  return (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedStudent(e)}
                          className="text-left group"
                        >
                          <div className="font-bold text-foreground group-hover:text-[#0F4C81] transition-colors">
                            {e.studentName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{e.studentEmail}</div>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#0F4C81]/10 text-[#0F4C81] font-black text-[11px]">
                          🇩🇪 {studentLevel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {e.batchId && e.batchId !== "waiting-list" ? (
                          <Link
                            href={`/sccg/school/batches/${e.batchId}`}
                            className="font-bold text-[#0F4C81] hover:underline"
                          >
                            {e.batchCode || e.courseName}
                          </Link>
                        ) : (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <Hourglass className="w-3 h-3" /> Waiting List
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={async () => {
                            const newStatus = isPaid ? "pending" : "paid";
                            await updateEnrollmentPaymentStatusAction(e.id, newStatus);
                            setEnrollments((prev) =>
                              prev.map((item) => (item.id === e.id ? { ...item, paymentStatus: newStatus } : item))
                            );
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-emerald-500/20 hover:text-emerald-700"
                          }`}
                        >
                          {isPaid ? "✅ Paid" : "⏳ Pending (Click to Pay)"}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        {e.status === "completed" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            Completed ({e.finalGrade || "Passed"})
                          </span>
                        ) : e.status === "enrolled" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                            Enrolled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700">
                            Waiting List
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedStudent(e)}
                          className="px-2.5 py-1 rounded-lg border text-xs font-bold hover:bg-muted"
                        >
                          Profile
                        </button>

                        {e.status === "enrolled" && (
                          <button
                            onClick={() => setShowCompleteModal(e)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Grade / Cert
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Student Profile Drawer / Modal ── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-black text-foreground">{selectedStudent.studentName}</h3>
                <p className="text-xs text-muted-foreground">{selectedStudent.studentEmail}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            {/* Profile Sections */}
            <div className="space-y-3 text-xs">
              <div className="bg-muted/40 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                  Personal & Placement Information
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block">Phone:</span>
                    <span className="font-bold text-foreground">{selectedStudent.mobileNumber || selectedStudent.studentPhone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Target Level:</span>
                    <span className="font-black text-[#0F4C81]">🇩🇪 {selectedStudent.desiredLevel || "A1"} German</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Registration Date:</span>
                    <span className="font-bold text-foreground">
                      {selectedStudent.enrolledAt ? new Date(selectedStudent.enrolledAt).toLocaleDateString() : "Recent"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">System ID:</span>
                    <span className="font-mono text-foreground">{selectedStudent.sccgId || selectedStudent.id}</span>
                  </div>
                </div>
                {selectedStudent.remarks && (
                  <div className="pt-1 border-t border-border/40">
                    <span className="text-muted-foreground block">Remarks:</span>
                    <span className="text-foreground">{selectedStudent.remarks}</span>
                  </div>
                )}
              </div>

              {/* Batch & Evaluation */}
              <div className="bg-muted/40 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                  Batch & Academic Progress
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block">Batch:</span>
                    <span className="font-bold text-foreground">{selectedStudent.batchCode || "Waiting List"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Status:</span>
                    <span className="font-bold capitalize text-foreground">{selectedStudent.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Final Grade:</span>
                    <span className="font-bold text-emerald-600">{selectedStudent.finalGrade || "In Progress"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Exam Score:</span>
                    <span className="font-bold text-foreground">{selectedStudent.examScore ? `${selectedStudent.examScore}%` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-muted/40 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                  Payment & Invoicing
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground block">Course Fee:</span>
                    <span className="font-black text-base text-foreground">€{selectedStudent.netFee || 500}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    selectedStudent.paymentStatus === "paid"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-amber-500/15 text-amber-700"
                  }`}>
                    {selectedStudent.paymentStatus === "paid" ? "PAID IN FULL" : "PAYMENT DUE"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="w-full h-10 rounded-xl border font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Register Student ── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0F4C81]" /> Register Student
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  await registerStudentAction(fd);
                  setShowRegisterModal(false);
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message || "Failed to register student");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name *</label>
                <input required name="studentName" placeholder="Student Name" className="w-full h-10 px-3 rounded-xl border bg-background" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                  <input required name="studentEmail" type="email" placeholder="student@example.com" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mobile Number</label>
                  <input name="mobileNumber" placeholder="+49 170 1234567" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">German Level *</label>
                  <select name="desiredLevel" defaultValue="A1" className="w-full h-10 px-3 rounded-xl border bg-background font-bold">
                    <option value="A1">🇩🇪 A1 German</option>
                    <option value="A2">🇩🇪 A2 German</option>
                    <option value="B1">🇩🇪 B1 German</option>
                    <option value="B2">🇩🇪 B2 German</option>
                    <option value="C1">🇩🇪 C1 German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Registration Action *</label>
                  <select name="registrationType" defaultValue="batch" className="w-full h-10 px-3 rounded-xl border bg-background font-medium">
                    <option value="batch">Assign to Batch</option>
                    <option value="waiting-list">Put on Waiting List</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Target Batch (If Assigning)</label>
                <select name="batchId" className="w-full h-10 px-3 rounded-xl border bg-background">
                  <option value="waiting-list">-- None / Put on Waiting List --</option>
                  {batches.filter((b) => !["completed", "cancelled"].includes(b.status)).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchName} ({b.courseName}) — {b.enrolledStudents}/{b.maxStudents} seats
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Remarks</label>
                <textarea name="remarks" rows={2} placeholder="Optional notes regarding placement..." className="w-full p-2.5 rounded-xl border bg-background text-xs" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors">
                  {loading ? "Registering..." : "Save Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Grade & Issue Certificate ── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-[#F5B800]" /> Grade & Complete
              </h3>
              <button onClick={() => setShowCompleteModal(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            <p className="text-xs text-muted-foreground">
              Finalize academic results for <strong className="text-foreground">{showCompleteModal.studentName}</strong> to issue CEFR certificate.
            </p>

            <form
              action={async (fd) => {
                setLoading(true);
                try {
                  await markEnrollmentCompletedAction(showCompleteModal.id, fd);
                  await issueCertificateAction(showCompleteModal.id, "completion");
                  setShowCompleteModal(null);
                  window.location.reload();
                } catch (err: any) {
                  alert(err.message || "Failed to complete enrollment");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Final Grade *</label>
                <select name="finalGrade" defaultValue="Sehr Gut (1.0)" className="w-full h-10 px-3 rounded-xl border bg-background font-bold">
                  <option value="Sehr Gut (1.0)">Sehr Gut (1.0)</option>
                  <option value="Gut (2.0)">Gut (2.0)</option>
                  <option value="Befriedigend (3.0)">Befriedigend (3.0)</option>
                  <option value="Ausreichend (4.0)">Ausreichend (4.0)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Exam Score (0-100) *</label>
                <input name="examScore" type="number" min="0" max="100" defaultValue="92" className="w-full h-10 px-3 rounded-xl border bg-background font-bold" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCompleteModal(null)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors">
                  {loading ? "Issuing..." : "Complete & Issue Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
