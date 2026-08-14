"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Euro,
  GraduationCap,
  Layers,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
  CreditCard,
} from "lucide-react";
import type {
  SchoolBatch,
  SchoolTeacher,
  SchoolTeamRole,
  TeacherEarning,
} from "@/types";
import { createTeamMemberAction, updateTeamMemberAction } from "../actions";

interface TeamClientProps {
  initialTeachers: SchoolTeacher[];
  batches: SchoolBatch[];
  earnings: TeacherEarning[];
}

export default function TeamClient({
  initialTeachers,
  batches,
  earnings,
}: TeamClientProps) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedWalletMember, setSelectedWalletMember] = useState<SchoolTeacher | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTeam = teachers.filter((t) => {
    const category = t.roleCategory || "instructor";
    const matchCategory = activeCategory === "ALL" || category === activeCategory;
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.specialization || "").toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const getRoleBadge = (role?: SchoolTeamRole) => {
    switch (role) {
      case "leader":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/15 text-purple-600 border border-purple-500/20">👑 School Leader</span>;
      case "coordinator":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 border border-amber-500/20">👨💼 Coordinator (5%)</span>;
      case "staff":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/15 text-blue-600 border border-blue-500/20">👨💻 Staff</span>;
      case "instructor":
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#0F4C81]/15 text-[#0F4C81] border border-[#0F4C81]/20">👨🏫 Instructor (70%)</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C81] uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" /> Faculty & Personnel
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Language Team & Internal Wallets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage instructors, batch coordinators, administrative staff, and automated revenue balances.
          </p>
        </div>

        <button
          onClick={() => { setError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0D3F6D] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Team Member
        </button>
      </div>

      {/* ── Role Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: "ALL", label: "All Team" },
            { id: "leader", label: "👑 School Leader" },
            { id: "instructor", label: "👨🏫 Instructors" },
            { id: "coordinator", label: "👨💼 Coordinators" },
            { id: "staff", label: "👨💻 Staff" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs"
          />
        </div>
      </div>

      {/* ── Team Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeam.map((m) => {
          const assignedBatches = batches.filter(
            (b) => b.teacherId === m.id || b.coordinatorId === m.id
          );
          const memberEarnings = earnings.filter((e) => e.teacherId === m.id);
          const computedTotalEarned = memberEarnings.reduce((sum, e) => sum + (e.earningAmount || 0), 0);
          const walletBalance = m.walletBalance ?? computedTotalEarned;

          return (
            <div
              key={m.id}
              className="bg-card border border-border/80 hover:border-[#0F4C81]/50 rounded-3xl p-6 shadow-sm space-y-4 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-foreground leading-tight">{m.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{m.email}</p>
                  </div>
                  {getRoleBadge(m.roleCategory)}
                </div>

                <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#0F4C81]" />
                    <span>{m.phone || "No phone provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#0F4C81]" />
                    <span>{m.specialization || "German Language Specialist"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#0F4C81]" />
                    <span>{assignedBatches.length} Assigned Batches</span>
                  </div>
                </div>

                {/* Internal Wallet Card */}
                {(m.roleCategory === "instructor" || m.roleCategory === "coordinator" || !m.roleCategory) && (
                  <div className="bg-gradient-to-r from-[#0F4C81]/10 to-[#F5B800]/10 border border-[#0F4C81]/20 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-[#0F4C81]" /> Internal Wallet
                      </span>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        €{walletBalance.toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedWalletMember(m)}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:border-[#0F4C81] text-[11px] font-bold text-foreground transition-all shadow-sm"
                    >
                      View Breakdown
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                <span className="text-muted-foreground capitalize">Status: {m.status || "active"}</span>
                <span className="font-bold text-[#0F4C81]">{m.language || "German"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTeam.length === 0 && (
        <div className="py-16 text-center bg-card border border-dashed rounded-3xl p-8">
          <UserCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No Team Members Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Click &quot;Add Team Member&quot; to assign instructors, coordinators, or school leaders.
          </p>
        </div>
      )}

      {/* ── Modal: Internal Wallet Breakdown ── */}
      {selectedWalletMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#0F4C81]" />
                  {selectedWalletMember.name}&apos;s Wallet
                </h3>
                <p className="text-xs text-muted-foreground">{selectedWalletMember.email}</p>
              </div>
              <button onClick={() => setSelectedWalletMember(null)} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
            </div>

            {/* Wallet summary card */}
            <div className="bg-gradient-to-r from-[#0F4C81] to-[#1A5F9E] p-5 rounded-2xl text-white space-y-1">
              <span className="text-xs text-white/80 font-bold uppercase tracking-wider">Available Wallet Balance</span>
              <div className="text-3xl font-black">
                €{(selectedWalletMember.walletBalance || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-white/70">
                Automatically credited upon batch completion ({selectedWalletMember.roleCategory === "coordinator" ? "5% Coordinator Share" : "70% Instructor Share"}).
              </p>
            </div>

            {/* Batch breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                Credited Cohorts & Batch Breakdown
              </h4>
              <div className="divide-y divide-border/60 text-xs">
                {batches
                  .filter((b) => b.teacherId === selectedWalletMember.id || b.coordinatorId === selectedWalletMember.id)
                  .map((b) => {
                    const isCoord = b.coordinatorId === selectedWalletMember.id;
                    const percent = isCoord ? 5 : 70;
                    const gross = (b.courseFeeEur || 500) * (b.enrolledStudents || 0);
                    const earn = Math.round((gross * percent) / 100);

                    return (
                      <div key={b.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground">{b.batchName} ({b.batchCode})</div>
                          <div className="text-[11px] text-muted-foreground">
                            {b.status.toUpperCase()} · {b.enrolledStudents} students · {percent}% share
                          </div>
                        </div>
                        <div className="text-right font-black text-sm text-emerald-600">
                          €{earn.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWalletMember(null)}
                className="w-full h-10 rounded-xl border font-bold text-xs"
              >
                Close Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Team Member ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0F4C81]" /> Add Team Member
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  await createTeamMemberAction(fd);
                  setShowAddModal(false);
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message || "Failed to add team member");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name *</label>
                <input required name="name" placeholder="e.g. Klaus Weber" className="w-full h-10 px-3 rounded-xl border bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                  <input required name="email" type="email" placeholder="faculty@mysccg.de" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input name="phone" placeholder="+49 170 555019" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Role / Position *</label>
                  <select name="roleCategory" defaultValue="instructor" className="w-full h-10 px-3 rounded-xl border bg-background font-bold">
                    <option value="instructor">👨🏫 Instructor (70% Share)</option>
                    <option value="coordinator">👨💼 Coordinator (5% Share)</option>
                    <option value="leader">👑 School Leader</option>
                    <option value="staff">👨💻 Operations Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Language</label>
                  <input name="language" defaultValue="German" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Specialization</label>
                <input name="specialization" defaultValue="German CEFR A1–B2 Instruction" className="w-full h-10 px-3 rounded-xl border bg-background" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors">
                  {loading ? "Adding..." : "Save Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
