"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Euro,
  GraduationCap,
  Hourglass,
  Layers,
  Play,
  Plus,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  AlertCircle,
  Check,
  X,
  CreditCard,
  Edit,
  Search,
  ChevronDown,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";
import type {
  BatchStatus,
  SchoolBatch,
  SchoolCourse,
  SchoolEnrollment,
  SchoolTeacher,
} from "@/types";
import {
  deleteEnrollmentAction,
  fillBatchFromWaitingListAction,
  registerStudentAction,
  updateBatchAction,
  updateBatchStatusAction,
  updateEnrollmentPaymentStatusAction,
  updateEnrollmentTimelineAction,
} from "../../actions";

export interface ExistingClientOption {
  id: string;
  candidateId?: string;
  name: string;
  email: string;
  phone?: string;
  source: "Candidate" | "Client" | "User";
  details?: string;
  paymentStatus?: "paid" | "pending";
}

interface BatchDetailClientProps {
  batch: SchoolBatch;
  course: SchoolCourse | null;
  enrollments: SchoolEnrollment[];
  waitingList: SchoolEnrollment[];
  teacher: SchoolTeacher | null;
  coordinator: SchoolTeacher | null;
  existingClients?: ExistingClientOption[];
}

export default function BatchDetailClient({
  batch,
  course,
  enrollments: initialEnrollments,
  waitingList,
  teacher,
  coordinator,
  existingClients = [],
}: BatchDetailClientProps) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [batchState, setBatchState] = useState(batch);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<SchoolEnrollment | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Searchable Client state for Add Student modal
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ExistingClientOption | null>(null);
  const [formStudentName, setFormStudentName] = useState("");
  const [formStudentEmail, setFormStudentEmail] = useState("");
  const [formMobileNumber, setFormMobileNumber] = useState("");
  const [formPaymentStatus, setFormPaymentStatus] = useState<"paid" | "pending">("pending");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const openAddStudentModal = () => {
    setClientSearch("");
    setSelectedClient(null);
    setFormStudentName("");
    setFormStudentEmail("");
    setFormMobileNumber("");
    setFormPaymentStatus("pending");
    setIsDropdownOpen(false);
    setShowAddStudentModal(true);
  };

  const handleSelectClient = (client: ExistingClientOption) => {
    setSelectedClient(client);
    setFormStudentName(client.name);
    setFormStudentEmail(client.email);
    setFormMobileNumber(client.phone || "");
    setFormPaymentStatus(client.paymentStatus || "pending");
    setIsDropdownOpen(false);
  };

  const handleClearSelectedClient = () => {
    setSelectedClient(null);
    setFormStudentName("");
    setFormStudentEmail("");
    setFormMobileNumber("");
    setFormPaymentStatus("pending");
    setClientSearch("");
  };

  const filteredClients = (existingClients || []).filter((c) => {
    if (!clientSearch.trim()) return true;
    const term = clientSearch.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.phone || "").toLowerCase().includes(term) ||
      (c.details || "").toLowerCase().includes(term)
    );
  });

  // Financial calculations based on course / service product price
  const courseFee = batchState.courseFeeEur || course?.courseFee || 500;
  const maxCapacity = batchState.maxStudents || 20;
  const enrolledCount = enrollments.length;
  const availableSlots = Math.max(0, maxCapacity - enrolledCount);

  // Dynamically resolve student fee based on batch/course product price
  const getEnrollmentFee = (e: SchoolEnrollment) => {
    if (e.netFee && e.netFee !== 500) return e.netFee;
    if (courseFee) return courseFee;
    return e.netFee || e.totalFee || courseFee;
  };

  const totalCollected = enrollments
    .filter((e) => e.paymentStatus === "paid")
    .reduce((sum, e) => sum + getEnrollmentFee(e), 0);

  const totalExpectedRevenue = enrolledCount * courseFee;

  const teacherPercent = (batchState.teacherSharePercent !== undefined ? batchState.teacherSharePercent : 70) / 100;
  const coordinatorPercent = (batchState.coordinatorSharePercent !== undefined ? batchState.coordinatorSharePercent : 5) / 100;
  const teacherShare = Math.round(totalCollected * teacherPercent);
  const coordinatorShare = Math.round(totalCollected * coordinatorPercent);
  const sccgShare = totalCollected - teacherShare - coordinatorShare;

  const getStatusBadge = (status: BatchStatus) => {
    switch (status) {
      case "running":
      case "active":
      case "in-progress":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">🟢 RUNNING</span>;
      case "planned":
      case "enrollment-open":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 border border-amber-500/20">🟡 PLANNED</span>;
      case "on-hold":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/15 text-orange-600 border border-orange-500/20">🟠 ON HOLD</span>;
      case "completed":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">✅ COMPLETED</span>;
      case "cancelled":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-red-500/15 text-red-600 border border-red-500/20">🔴 CANCELLED</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto page-enter pb-12">
      {/* ── Back Link & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/sccg/school/batches"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Batches
        </Link>

        {/* Batch Status & Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {batchState.status === "planned" && (
            <button
              onClick={async () => {
                setLoading(true);
                await updateBatchStatusAction(batchState.id, "running");
                setBatchState((prev) => ({ ...prev, status: "running" }));
                setLoading(false);
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" /> Start Batch
            </button>
          )}

          {batchState.status === "running" && (
            <button
              onClick={async () => {
                if (confirm("Complete this batch? This will finalize graduation and credit Instructor (70%) and Coordinator (5%) wallets.")) {
                  setLoading(true);
                  await updateBatchStatusAction(batchState.id, "completed");
                  setBatchState((prev) => ({ ...prev, status: "completed" }));
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete Batch & Credit Wallets
            </button>
          )}

          {availableSlots > 0 && batchState.status !== "completed" && (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fillBatchFromWaitingListAction(batchState.id);
                  if (res.addedCount > 0) {
                    setMessage({ type: "success", text: `Successfully auto-assigned ${res.addedCount} students from waiting list: ${res.assignedStudents.join(", ")}` });
                    window.location.reload();
                  } else {
                    setMessage({ type: "error", text: "No eligible students currently found on the waiting list." });
                  }
                } catch (err: any) {
                  setMessage({ type: "error", text: err.message || "Failed to fill from waiting list" });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5B800] hover:bg-[#E5AA00] text-slate-950 text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Fill From Waiting List ({waitingList.length} waiting)
            </button>
          )}

          <button
            onClick={() => setShowEditBatchModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0F4C81]/30 hover:bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold transition-all shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Timeline
          </button>

          <button
            onClick={openAddStudentModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0D3F6D] text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Student
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
          message.type === "success" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "bg-red-500/15 text-red-600 border border-red-500/20"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs">✕</button>
        </div>
      )}

      {/* ── Batch Banner ── */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                {batchState.batchCode}
              </span>
              <span className="text-xs font-bold text-muted-foreground">{batchState.courseName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">{batchState.batchName}</h1>
          </div>
          <div>{getStatusBadge(batchState.status)}</div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-muted/40 p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">👨🏫 Instructor (70%)</span>
            <span className="font-black text-foreground text-sm">{batchState.teacherName}</span>
            <p className="text-[10px] text-muted-foreground">{teacher?.email || "Assigned Instructor"}</p>
          </div>
          <div className="bg-muted/40 p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">👨💼 Coordinator (5%)</span>
            <span className="font-black text-foreground text-sm">{batchState.coordinatorName || "Unassigned"}</span>
            <p className="text-[10px] text-muted-foreground">{coordinator?.email || "Support Coordinator"}</p>
          </div>
          <div className="bg-muted/40 p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">📅 Schedule</span>
            <span className="font-bold text-foreground block">{batchState.schedule}</span>
            <p className="text-[10px] text-muted-foreground">{batchState.startDate} to {batchState.endDate}</p>
          </div>
          <div className="bg-muted/40 p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">👥 Enrollment</span>
            <span className="font-black text-foreground text-sm">{enrolledCount} / {maxCapacity} Students</span>
            <p className="text-[10px] text-emerald-600 font-bold">{availableSlots} seats available</p>
          </div>
        </div>

        {/* ── Auto Revenue Split Breakdown Box ── */}
        <div className="bg-gradient-to-r from-blue-500/10 via-amber-500/10 to-emerald-500/10 border border-border/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                <Euro className="w-4 h-4 text-emerald-600" /> Automated 70/5/25 Batch Financial Split
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Course fee: €{courseFee} per student · Enrolled: {enrolledCount} · Total Collected: €{totalCollected.toLocaleString()}
              </p>
            </div>
            <span className="text-xs font-black text-foreground bg-card px-3 py-1 rounded-xl border border-border">
              Potential: €{totalExpectedRevenue.toLocaleString()} Max
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card/80 border border-blue-500/30 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-blue-600 block">👨🏫 Instructor Share (70%)</span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">€{teacherShare.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Credits to {batchState.teacherName}&apos;s wallet</p>
            </div>
            <div className="bg-card/80 border border-amber-500/30 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-amber-600 block">👨💼 Coordinator Share (5%)</span>
              <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">€{coordinatorShare.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Credits to Coordinator wallet</p>
            </div>
            <div className="bg-card/80 border border-emerald-500/30 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-600 block">🏢 SCCG Lab Share (25%)</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">€{sccgShare.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Lab infrastructure & operation</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Students & Payment Tracking Table ── */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-foreground">Enrolled Students & Payment Status</h2>
            <p className="text-xs text-muted-foreground">Track student payments, invoices, and certificate status.</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">{enrolledCount} Enrolled</span>
        </div>

        {enrollments.length === 0 ? (
          <div className="py-12 text-center bg-muted/20 border border-dashed rounded-2xl p-6">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground">No students enrolled in this batch yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Use &quot;Fill From Waiting List&quot; or click &quot;Add Student&quot; to assign students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border/60">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Student Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Zertifikat-Zeitraum</th>
                  <th className="py-3 px-4">Fee (€)</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {enrollments.map((e) => {
                  const isPaid = e.paymentStatus === "paid";
                  const studentTimeline = e.courseTimeline || (batchState.startDate && batchState.endDate ? `${new Date(batchState.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} — ${new Date(batchState.endDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}` : "—");
                  return (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">{e.studentName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{e.sccgId || "ENR-STD"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div>{e.studentEmail}</div>
                        <div className="text-[11px]">{e.mobileNumber || e.studentPhone || "—"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{studentTimeline}</span>
                          <button
                            type="button"
                            onClick={() => setEditingEnrollment(e)}
                            className="p-1 hover:bg-muted rounded text-[#0F4C81] transition-colors"
                            title="Zeitraum bearbeiten"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        €{getEnrollmentFee(e)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/20 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingEnrollment(e)}
                            className="px-2.5 py-1.5 rounded-xl border border-[#0F4C81]/30 hover:bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold transition-all flex items-center gap-1"
                            title="Zeitraum für Zertifikat anpassen"
                          >
                            <Edit className="w-3 h-3" /> Zeitraum
                          </button>

                          <button
                            onClick={async () => {
                              const newStatus = isPaid ? "pending" : "paid";
                              await updateEnrollmentPaymentStatusAction(e.id, newStatus);
                              setEnrollments((prev) =>
                                prev.map((item) => (item.id === e.id ? { ...item, paymentStatus: newStatus } : item))
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isPaid
                                ? "border border-border text-muted-foreground hover:text-foreground"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            }`}
                          >
                            {isPaid ? "Mark Pending" : "Collect (€" + getEnrollmentFee(e) + ")"}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to remove "${e.studentName}" from this batch?`)) return;
                              setLoading(true);
                              try {
                                await deleteEnrollmentAction(e.id);
                                setEnrollments((prev) => prev.filter((item) => item.id !== e.id));
                                setMessage({ type: "success", text: `${e.studentName} has been removed from this batch.` });
                              } catch (err: any) {
                                alert(err.message || "Failed to remove student from batch");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="p-1.5 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors flex items-center justify-center"
                            title={`Remove ${e.studentName} from batch`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Add Student to Batch ── */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0F4C81]" /> Add Student to {batchState.batchCode}
              </h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            {/* Search Existing Clients Dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#0F4C81]" />
                  <span>Choose From Existing Clients / Candidates</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {existingClients.length} registered
                </span>
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search by client name, email, phone, or ID..."
                    className="w-full h-10 pl-9 pr-8 rounded-xl border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                  {clientSearch ? (
                    <button
                      type="button"
                      onClick={() => setClientSearch("")}
                      className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 absolute right-3 text-muted-foreground pointer-events-none" />
                  )}
                </div>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl z-20 divide-y divide-border">
                    {filteredClients.length > 0 ? (
                      filteredClients.slice(0, 50).map((c) => (
                        <button
                          key={`${c.source}-${c.id}`}
                          type="button"
                          onClick={() => handleSelectClient(c)}
                          className="w-full text-left p-2.5 hover:bg-muted/70 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">{c.name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                c.source === "Candidate"
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                  : c.source === "Client"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              }`}>
                                {c.source}
                              </span>
                              {c.details && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  • {c.details}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5 truncate">
                              {c.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{c.email}</span>
                                </span>
                              )}
                              {c.phone && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  <span>{c.phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedClient?.id === c.id ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-[11px] text-[#0F4C81] font-bold shrink-0 hover:underline">Select</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No clients found matching &quot;{clientSearch}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Client indicator */}
              {selectedClient && (
                <div className="p-2.5 rounded-xl bg-[#0F4C81]/10 border border-[#0F4C81]/20 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-4 h-4 text-[#0F4C81] shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-foreground">{selectedClient.name}</span>
                      <span className="text-muted-foreground ml-1.5">({selectedClient.email || selectedClient.phone})</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0F4C81] text-white shrink-0">
                      {selectedClient.source}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedClient}
                    className="text-xs text-muted-foreground hover:text-red-600 font-bold p-1"
                    title="Clear selected client"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-2 text-[10px] font-bold text-muted-foreground uppercase">
                Student Details (Editable)
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <form
              action={async (fd) => {
                setLoading(true);
                try {
                  fd.set("registrationType", "batch");
                  fd.set("batchId", batchState.id);
                  fd.set("desiredLevel", batchState.level || "A1");
                  await registerStudentAction(fd);
                  setShowAddStudentModal(false);
                  window.location.reload();
                } catch (err: any) {
                  alert(err.message || "Failed to add student");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <input type="hidden" name="candidateId" value={selectedClient?.candidateId || ""} />
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name *</label>
                <input
                  required
                  name="studentName"
                  value={formStudentName}
                  onChange={(e) => setFormStudentName(e.target.value)}
                  placeholder="Student Name"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                <input
                  required
                  name="studentEmail"
                  type="email"
                  value={formStudentEmail}
                  onChange={(e) => setFormStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mobile Number</label>
                <input
                  name="mobileNumber"
                  value={formMobileNumber}
                  onChange={(e) => setFormMobileNumber(e.target.value)}
                  placeholder="+49 170 1234567"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Payment Status
                </label>
                <select
                  name="paymentStatus"
                  value={formPaymentStatus}
                  onChange={(e) => setFormPaymentStatus(e.target.value as "paid" | "pending")}
                  className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-bold"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid (Fully Paid / Verified in Gallery)</option>
                </select>
                {selectedClient?.paymentStatus === "paid" && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    ✓ Verified paid from Candidate Gallery
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="w-1/2 h-10 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors"
                >
                  {loading ? "Adding..." : "Add to Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Batch Timeline & Details ── */}
      {showEditBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0F4C81]" /> Batch Timeline bearbeiten: {batchState.batchCode}
              </h3>
              <button onClick={() => setShowEditBatchModal(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setLoading(true);
                try {
                  await updateBatchAction(batchState.id, fd);
                  const updatedStart = String(fd.get("startDate"));
                  const updatedEnd = String(fd.get("endDate"));
                  const updatedName = String(fd.get("batchName"));
                  const updatedSchedule = String(fd.get("schedule"));
                  const updatedStatus = String(fd.get("status")) as BatchStatus;
                  const updatedMax = Number(fd.get("maxStudents")) || batchState.maxStudents;
                  const updatedFee = Number(fd.get("courseFeeEur")) || batchState.courseFeeEur;

                  setBatchState((prev) => ({
                    ...prev,
                    batchName: updatedName,
                    startDate: updatedStart,
                    endDate: updatedEnd,
                    schedule: updatedSchedule,
                    status: updatedStatus,
                    maxStudents: updatedMax,
                    courseFeeEur: updatedFee,
                  }));
                  setShowEditBatchModal(false);
                  setMessage({ type: "success", text: "Batch-Timeline erfolgreich aktualisiert." });
                } catch (err: any) {
                  alert(err.message || "Fehler beim Aktualisieren des Batches");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">Batch Name *</label>
                <input
                  required
                  name="batchName"
                  defaultValue={batchState.batchName}
                  className="w-full h-10 px-3 rounded-xl border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground uppercase mb-1">Startdatum *</label>
                  <input
                    required
                    type="date"
                    name="startDate"
                    defaultValue={batchState.startDate}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted-foreground uppercase mb-1">Enddatum *</label>
                  <input
                    required
                    type="date"
                    name="endDate"
                    defaultValue={batchState.endDate}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">Zeitplan / Zeiten *</label>
                <input
                  required
                  name="schedule"
                  defaultValue={batchState.schedule}
                  placeholder="z. B. Mo & Mi 18:00 - 19:30 CET"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground uppercase mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={batchState.status}
                    className="w-full h-10 px-2 rounded-xl border bg-background text-foreground font-bold"
                  >
                    <option value="planned">Planned (Geplant)</option>
                    <option value="running">Running (Aktiv)</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed (Beendet)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground uppercase mb-1">Kapazität</label>
                  <input
                    type="number"
                    min="1"
                    name="maxStudents"
                    defaultValue={batchState.maxStudents || 20}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground uppercase mb-1">Gebühr (€)</label>
                  <input
                    type="number"
                    min="0"
                    name="courseFeeEur"
                    defaultValue={batchState.courseFeeEur || 500}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditBatchModal(false)}
                  className="w-1/2 h-10 rounded-xl border font-bold hover:bg-muted transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-[#0D3F6D] transition-colors disabled:opacity-50"
                >
                  {loading ? "Speichern..." : "Zeitplan speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Student Course Timeline ── */}
      {editingEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0F4C81]" /> Kurs-Zeitraum bearbeiten
              </h3>
              <button onClick={() => setEditingEnrollment(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            <p className="text-xs text-muted-foreground">
              Dieser Zeitraum wird verbindlich auf dem offiziellen Zertifikat von <strong>{editingEnrollment.studentName}</strong> ausgewiesen.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setLoading(true);
                try {
                  const timeline = String(fd.get("courseTimeline") || "").trim();
                  await updateEnrollmentTimelineAction(editingEnrollment.id, timeline);
                  setEnrollments((prev) =>
                    prev.map((item) => (item.id === editingEnrollment.id ? { ...item, courseTimeline: timeline } : item))
                  );
                  setEditingEnrollment(null);
                  setMessage({ type: "success", text: `Zeitraum für ${editingEnrollment.studentName} erfolgreich auf "${timeline}" aktualisiert.` });
                } catch (err: any) {
                  alert(err.message || "Fehler beim Aktualisieren des Zeitraums");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">Student</label>
                <div className="p-2.5 rounded-xl bg-muted/50 font-bold text-foreground">
                  {editingEnrollment.studentName} ({editingEnrollment.studentEmail})
                </div>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground uppercase mb-1">
                  Zertifikat-Zeitraum *
                </label>
                <input
                  required
                  name="courseTimeline"
                  defaultValue={
                    editingEnrollment.courseTimeline ||
                    (batchState.startDate && batchState.endDate
                      ? `${new Date(batchState.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} — ${new Date(batchState.endDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`
                      : "")
                  }
                  placeholder="z. B. Juni 2026 — August 2026"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-foreground font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Erscheint auf dem Zertifikat als: <em>ZEITRAUM: [Eingabe]</em>
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setEditingEnrollment(null)} className="w-1/2 h-10 rounded-xl border font-bold hover:bg-muted">Abbrechen</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-[#0D3F6D] transition-colors disabled:opacity-50">
                  {loading ? "Speichern..." : "Zeitraum speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
