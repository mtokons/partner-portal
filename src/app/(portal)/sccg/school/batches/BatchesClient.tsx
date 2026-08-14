"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Euro,
  Hourglass,
  Layers,
  Play,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  ArrowRight,
  Pause,
  XCircle,
  Trash2,
} from "lucide-react";
import type { BatchStatus, SchoolBatch, SchoolCourse, SchoolTeacher } from "@/types";
import {
  createBatchAction,
  deleteBatchAction,
  fillBatchFromWaitingListAction,
  updateBatchStatusAction,
} from "../actions";

interface BatchesClientProps {
  initialBatches: SchoolBatch[];
  courses: SchoolCourse[];
  teachers: SchoolTeacher[];
}

export default function BatchesClient({ initialBatches, courses, teachers }: BatchesClientProps) {
  const [batches, setBatches] = useState(initialBatches);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredBatches = batches.filter((b) => {
    const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
    const matchSearch =
      !search ||
      b.batchName.toLowerCase().includes(search.toLowerCase()) ||
      b.batchCode.toLowerCase().includes(search.toLowerCase()) ||
      b.teacherName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusBadge = (status: BatchStatus) => {
    switch (status) {
      case "running":
      case "active":
      case "in-progress":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">🟢 RUNNING</span>;
      case "planned":
      case "enrollment-open":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 border border-amber-500/20">🟡 PLANNED</span>;
      case "on-hold":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-600 border border-orange-500/20">🟠 ON HOLD</span>;
      case "completed":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">✅ COMPLETED</span>;
      case "cancelled":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-600 border border-red-500/20">🔴 CANCELLED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C81] uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" /> Language School Batches
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Cohort & Batch Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage cohort schedules, student capacities, and automated 70/5/25 revenue distribution.
          </p>
        </div>

        <button
          onClick={() => { setError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0D3F6D] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Batch
        </button>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["ALL", "planned", "running", "on-hold", "completed", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === st
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "ALL" ? "All Batches" : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batches..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs"
          />
        </div>
      </div>

      {/* ── Batches List ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredBatches.map((b) => {
          const capacity = b.maxStudents || 20;
          const enrolled = b.enrolledStudents || 0;
          const percent = Math.round((enrolled / capacity) * 100);
          const fee = b.courseFeeEur || 500;
          const gross = fee * enrolled;
          const teacherEarn = Math.round(gross * 0.7);
          const coordEarn = Math.round(gross * 0.05);

          return (
            <div
              key={b.id}
              className="bg-card border border-border/80 hover:border-[#0F4C81]/50 rounded-3xl p-6 shadow-sm space-y-4 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black tracking-wider uppercase text-muted-foreground">
                      {b.batchCode}
                    </span>
                    <h3 className="font-bold text-lg text-foreground leading-tight mt-0.5">{b.batchName}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{b.courseName}</p>
                  </div>
                  {getStatusBadge(b.status)}
                </div>

                {/* Team Info */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">👨🏫 Instructor (70%)</span>
                    <span className="font-bold text-foreground">{b.teacherName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block">👨💼 Coordinator (5%)</span>
                    <span className="font-bold text-foreground">{b.coordinatorName || "Unassigned"}</span>
                  </div>
                </div>

                {/* Dates & Schedule */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0F4C81]" />
                    {b.startDate} to {b.endDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#0F4C81]" />
                    {b.schedule}
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">Student Capacity</span>
                    <span className="text-muted-foreground">{enrolled} / {capacity} Enrolled ({percent}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percent >= 100 ? "bg-emerald-600" : percent > 50 ? "bg-[#0F4C81]" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Financial Summary Preview */}
                <div className="flex justify-between items-center text-xs pt-2 border-t border-border/60">
                  <span className="font-medium text-muted-foreground">Est. Collected: €{gross.toLocaleString()}</span>
                  <span className="font-bold text-[#0F4C81]">Teacher: €{teacherEarn.toLocaleString()} · Coord: €{coordEarn.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                <Link
                  href={`/sccg/school/batches/${b.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-[#0D3F6D] text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  Manage Batch <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1.5">
                  {enrolled < capacity && (
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await fillBatchFromWaitingListAction(b.id);
                          alert(`Filled ${res.addedCount} students from waiting list.`);
                          window.location.reload();
                        } catch (err: any) {
                          alert(err.message || "Failed to fill from waiting list");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F5B800]/20 hover:bg-[#F5B800]/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all flex items-center gap-1"
                      title="Smart Fill from Waiting List"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Auto-Fill
                    </button>
                  )}

                  {b.status === "planned" && (
                    <button
                      onClick={async () => {
                        await updateBatchStatusAction(b.id, "running");
                        window.location.reload();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1"
                      title="Start Batch"
                    >
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                  )}

                  {b.status === "running" && (
                    <button
                      onClick={async () => {
                        if (confirm("Complete this batch? This will automatically calculate and credit Instructor (70%) and Coordinator (5%) wallets.")) {
                          await updateBatchStatusAction(b.id, "completed");
                          window.location.reload();
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1"
                      title="Complete Batch & Auto-Credit Wallets"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (confirm(`Delete batch ${b.batchName}?`)) {
                        await deleteBatchAction(b.id);
                        setBatches((prev) => prev.filter((item) => item.id !== b.id));
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
                    title="Delete Batch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBatches.length === 0 && (
        <div className="py-16 text-center bg-card border border-dashed rounded-3xl p-8">
          <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No Batches Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Click &quot;Create New Batch&quot; to schedule your next German language training cohort.
          </p>
        </div>
      )}

      {/* ── Modal: Create Batch ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F4C81]" /> Create Training Batch
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  await createBatchAction(fd);
                  setShowAddModal(false);
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message || "Failed to create batch");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Course *</label>
                <select required name="courseId" className="w-full h-10 px-3 rounded-xl border bg-background font-medium">
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName} ({c.level}) — €{c.courseFee}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Batch Code *</label>
                  <input required name="batchCode" placeholder="e.g. A1-2026-03" className="w-full h-10 px-3 rounded-xl border bg-background uppercase font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Batch Name *</label>
                  <input required name="batchName" placeholder="e.g. A1 Evening Intensive" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Instructor (70% Share) *</label>
                  <select required name="teacherId" className="w-full h-10 px-3 rounded-xl border bg-background">
                    <option value="">-- Choose Instructor --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.specialization || "Instructor"})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Coordinator (5% Share)</label>
                  <select name="coordinatorId" className="w-full h-10 px-3 rounded-xl border bg-background">
                    <option value="">-- Choose Coordinator --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Start Date *</label>
                  <input required name="startDate" type="date" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">End Date *</label>
                  <input required name="endDate" type="date" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Capacity (Max Students)</label>
                  <input name="maxStudents" type="number" defaultValue="20" min="1" className="w-full h-10 px-3 rounded-xl border bg-background font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Schedule</label>
                  <input name="schedule" defaultValue="Tue & Thu 18:30 - 20:00" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              {/* Automatic split preview note */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-blue-700 dark:text-blue-300">💰 Automated Financial Setup:</p>
                <p className="text-muted-foreground">Teacher 70% · Coordinator 5% · SCCG Lab 25%</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors">
                  {loading ? "Creating..." : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
