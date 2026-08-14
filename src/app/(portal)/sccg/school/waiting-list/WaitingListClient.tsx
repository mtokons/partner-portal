"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Euro,
  Hourglass,
  Layers,
  Mail,
  MoveRight,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  CheckCircle2,
} from "lucide-react";
import type { SchoolBatch, SchoolEnrollment } from "@/types";
import {
  fillBatchFromWaitingListAction,
  moveStudentToBatchAction,
  registerStudentAction,
  removeStudentFromWaitingListAction,
} from "../actions";

interface WaitingListClientProps {
  initialWaitingList: SchoolEnrollment[];
  batches: SchoolBatch[];
}

export default function WaitingListClient({
  initialWaitingList,
  batches,
}: WaitingListClientProps) {
  const [waitingList, setWaitingList] = useState(initialWaitingList);
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [movingStudent, setMovingStudent] = useState<SchoolEnrollment | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredList = waitingList.filter((e) => {
    const studentLevel = (e.desiredLevel || "A1").toUpperCase();
    const matchLevel = levelFilter === "ALL" || studentLevel === levelFilter;
    const matchSearch =
      !search ||
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      (e.mobileNumber || "").toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  // Open batches with available seats
  const availableBatches = batches.filter(
    (b) => !["completed", "cancelled"].includes(b.status) && (b.enrolledStudents || 0) < (b.maxStudents || 20)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <Hourglass className="w-4 h-4" /> Queue Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Smart Waiting List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automated intake queue for students awaiting cohort placement (FIFO matching).
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0D3F6D] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add to Waiting List
        </button>
      </div>

      {/* ── Auto-Entry Explainer Banner ── */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 text-xs text-amber-900 dark:text-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="font-black flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
            <Sparkles className="w-4 h-4" /> Intelligent Auto-Entry Rules
          </span>
          <p className="text-muted-foreground">
            Students are placed here when target cohorts reach capacity, when no immediate start date is available, or via online portal submissions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-card border border-border font-bold text-foreground">
            {waitingList.length} Total In Queue
          </span>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["ALL", "A1", "A2", "B1", "B2", "C1"].map((lvl) => {
            const count = waitingList.filter(
              (e) => (e.desiredLevel || "A1").toUpperCase() === lvl
            ).length;
            return (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  levelFilter === lvl
                    ? "bg-[#0F4C81] text-white shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl === "ALL" ? `All (${waitingList.length})` : `🇩🇪 ${lvl} (${count})`}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search waiting list..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs"
          />
        </div>
      </div>

      {/* ── Waiting List Table ── */}
      <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border/60">
              <tr>
                <th className="py-3.5 px-4">Student Details</th>
                <th className="py-3.5 px-4">Desired Level</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Remarks</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No students currently on the waiting list for this level.
                  </td>
                </tr>
              ) : (
                filteredList.map((e, idx) => {
                  const lvl = (e.desiredLevel || "A1").toUpperCase();
                  return (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center text-muted-foreground font-mono text-[10px]">#{idx + 1}</span>
                          <div>
                            <div className="font-bold text-foreground">{e.studentName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{e.sccgId || "WL-STD"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#0F4C81]/10 text-[#0F4C81] font-black text-[11px]">
                          🇩🇪 {lvl} German
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : "Recent"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div>{e.studentEmail}</div>
                        <div className="text-[11px] font-mono">{e.mobileNumber || e.studentPhone || "—"}</div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                        {e.remarks || e.waitingListNotes || "Awaiting cohort start"}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => {
                            setMovingStudent(e);
                            setSelectedBatchId(availableBatches[0]?.id || "");
                          }}
                          className="px-3 py-1 rounded-xl bg-[#0F4C81] hover:bg-[#0D3F6D] text-white text-xs font-bold transition-all inline-flex items-center gap-1"
                        >
                          Move to Batch <MoveRight className="w-3 h-3" />
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm(`Remove ${e.studentName} from waiting list?`)) {
                              await removeStudentFromWaitingListAction(e.id);
                              setWaitingList((prev) => prev.filter((item) => item.id !== e.id));
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors inline-block align-middle"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Move Student to Batch ── */}
      {movingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F4C81]" /> Assign to Batch
              </h3>
              <button onClick={() => setMovingStudent(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select an open batch to assign <strong className="text-foreground">{movingStudent.studentName}</strong> (Desired Level: 🇩🇪 {movingStudent.desiredLevel || "A1"}).
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedBatchId) return;
                setLoading(true);
                try {
                  await moveStudentToBatchAction(movingStudent.id, selectedBatchId);
                  setMovingStudent(null);
                  window.location.reload();
                } catch (err: any) {
                  alert(err.message || "Failed to assign to batch");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Target Cohort *</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                >
                  <option value="">-- Select Open Batch --</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchName} ({b.courseName}) — {b.enrolledStudents}/{b.maxStudents} seats
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setMovingStudent(null)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading || !selectedBatchId} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors">
                  {loading ? "Assigning..." : "Confirm Placement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Register into Waiting List ── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Hourglass className="w-5 h-5 text-amber-600" /> Put on Waiting List
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            <form
              action={async (fd) => {
                setLoading(true);
                try {
                  fd.set("registrationType", "waiting-list");
                  await registerStudentAction(fd);
                  setShowRegisterModal(false);
                  window.location.reload();
                } catch (err: any) {
                  alert(err.message || "Failed to add to waiting list");
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                  <input required name="studentEmail" type="email" placeholder="student@example.com" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mobile Number</label>
                  <input name="mobileNumber" placeholder="+49 170 1234567" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Desired German Level *</label>
                <select name="desiredLevel" defaultValue="A1" className="w-full h-10 px-3 rounded-xl border bg-background font-bold">
                  <option value="A1">🇩🇪 A1 German</option>
                  <option value="A2">🇩🇪 A2 German</option>
                  <option value="B1">🇩🇪 B1 German</option>
                  <option value="B2">🇩🇪 B2 German</option>
                  <option value="C1">🇩🇪 C1 German</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Queue Remarks</label>
                <textarea name="remarks" rows={2} placeholder="Reason for waiting or time preference..." className="w-full p-2.5 rounded-xl border bg-background text-xs" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors">
                  {loading ? "Adding..." : "Add to Waiting List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
