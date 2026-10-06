"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Plus,
  Sparkles,
  Search,
  Layers,
  Mail,
  Phone,
  BookOpen,
  Trash2,
  Pencil,
  CheckCircle2,
  ExternalLink,
  X,
  Award,
  Wallet,
  Check,
  ChevronDown,
} from "lucide-react";
import type { SchoolBatch, SchoolTeacher, SchoolTeamRole } from "@/types";
import {
  createTeacherAction,
  updateTeacherAction,
  deleteTeacherAction,
} from "../actions";

export interface AvailableExpert {
  id: string;
  expertId?: string;
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  status: string;
  source?: "Service Expert" | "Expert Bank";
}

interface TeachersClientProps {
  initialTeachers: SchoolTeacher[];
  batches: SchoolBatch[];
  availableExperts: AvailableExpert[];
}

export default function TeachersClient({
  initialTeachers,
  batches,
  availableExperts,
}: TeachersClientProps) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expertFilter, setExpertFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"expert" | "direct">("expert");
  const [editingTeacher, setEditingTeacher] = useState<SchoolTeacher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for Onboard from Expert / Add Direct
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [expertSearch, setExpertSearch] = useState("");
  const [isExpertDropdownOpen, setIsExpertDropdownOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSpecialization, setFormSpecialization] = useState("Deutsch als Fremdsprache (DaF)");
  const [formLanguage, setFormLanguage] = useState("German");
  const [formRole, setFormRole] = useState<SchoolTeamRole>("instructor");
  const [formRevenueShare, setFormRevenueShare] = useState<number>(70);

  // Handle selecting an expert from dropdown
  const handleSelectExpert = (expertId: string) => {
    setSelectedExpertId(expertId);
    setIsExpertDropdownOpen(false);
    if (!expertId) return;
    const exp = availableExperts.find((e) => e.id === expertId);
    if (exp) {
      setFormName(exp.name);
      setFormEmail(exp.email || "");
      setFormPhone(exp.phone || "");
      setFormSpecialization(exp.specialization || "Deutsch als Fremdsprache (DaF)");
      setFormLanguage("German");
      setFormRole("instructor");
      setFormRevenueShare(70);
      setExpertSearch(exp.name);
    }
  };

  const handleClearSelectedExpert = () => {
    setSelectedExpertId("");
    setExpertSearch("");
    setFormName("");
    setFormEmail("");
    setFormPhone("");
  };

  const filteredExperts = availableExperts.filter((exp) => {
    if (!expertSearch.trim()) return true;
    const term = expertSearch.toLowerCase();
    return (
      (exp.name || "").toLowerCase().includes(term) ||
      (exp.email || "").toLowerCase().includes(term) ||
      (exp.phone || "").toLowerCase().includes(term) ||
      (exp.specialization || "").toLowerCase().includes(term) ||
      (exp.source || "").toLowerCase().includes(term)
    );
  });

  const selectedExpert = availableExperts.find((e) => e.id === selectedExpertId);

  const openAddModal = (mode: "expert" | "direct") => {
    setError(null);
    setAddMode(mode);
    setSelectedExpertId("");
    setExpertSearch("");
    setIsExpertDropdownOpen(false);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormSpecialization("Deutsch als Fremdsprache (DaF)");
    setFormLanguage("German");
    setFormRole("instructor");
    setFormRevenueShare(70);
    setShowAddModal(true);
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchExpert =
      expertFilter === "ALL" ||
      (expertFilter === "EXPERT" && Boolean(t.expertId)) ||
      (expertFilter === "DIRECT" && !t.expertId);
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.specialization || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchExpert && matchSearch;
  });

  // KPI counts
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter((t) => t.status === "active").length;
  const linkedExpertsCount = teachers.filter((t) => Boolean(t.expertId)).length;
  const totalBatchesAssigned = teachers.reduce(
    (sum, t) => sum + (t.assignedBatches?.length || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C81] uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" /> Language School Instructors
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            Teachers &amp; Instructors
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Onboard instructors from the Expert Bank, register direct teachers, and manage CEFR batch assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openAddModal("expert")}
            className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0D3F6D] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> Onboard from Expert
          </button>
          <button
            onClick={() => openAddModal("direct")}
            className="flex items-center gap-2 bg-card border border-border hover:bg-muted text-foreground font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#0F4C81]" /> Add Teacher Directly
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Teachers</span>
            <Users className="w-4 h-4 text-[#0F4C81]" />
          </div>
          <p className="text-2xl font-black text-foreground">{totalTeachers}</p>
          <span className="text-[11px] text-muted-foreground">Registered teaching faculty</span>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{activeTeachers}</p>
          <span className="text-[11px] text-muted-foreground">Ready for batch scheduling</span>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">From Expert Bank</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{linkedExpertsCount}</p>
          <span className="text-[11px] text-muted-foreground">Unified platform experts</span>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Cohorts</span>
            <Layers className="w-4 h-4 text-[#0F4C81]" />
          </div>
          <p className="text-2xl font-black text-foreground">{totalBatchesAssigned}</p>
          <span className="text-[11px] text-muted-foreground">Total assigned batches</span>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {["ALL", "active", "inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === status
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "ALL" ? "All Status" : status}
            </button>
          ))}
          <div className="h-6 w-px bg-border my-auto mx-1" />
          {[
            { key: "ALL", label: "All Origins" },
            { key: "EXPERT", label: "🔗 Expert Bank" },
            { key: "DIRECT", label: "Direct Teachers" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setExpertFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                expertFilter === item.key
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teachers by name, email, specialization..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs"
          />
        </div>
      </div>

      {/* ── Teachers Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeachers.map((t) => {
          // Find batches taught by this teacher
          const teacherBatches = batches.filter(
            (b) => b.teacherId === t.id || (t.assignedBatches || []).includes(b.id)
          );

          return (
            <div
              key={t.id}
              className="bg-card border border-border/80 hover:border-[#0F4C81]/50 rounded-3xl p-5 shadow-sm space-y-4 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center font-black text-sm border border-[#0F4C81]/20">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-tight">{t.name}</h3>
                      <p className="text-xs text-muted-foreground">{t.roleCategory || "Instructor"}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === "active"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.status.toUpperCase()}
                  </span>
                </div>

                {/* Expert relationship badge */}
                {t.expertId ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Onboarded from Expert Bank</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 border border-border text-muted-foreground rounded-xl text-xs font-semibold">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Direct Language Instructor</span>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-[#0F4C81]" />
                    <span className="truncate">{t.email}</span>
                  </div>
                  {t.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-[#0F4C81]" />
                      <span>{t.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 shrink-0 text-[#0F4C81]" />
                    <span className="truncate">{t.specialization || "German Instruction"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                  <div className="bg-muted/40 rounded-xl p-2 text-center">
                    <span className="block text-[10px] text-muted-foreground font-bold uppercase">Revenue Share</span>
                    <span className="font-black text-foreground text-sm">
                      {t.revenueSharePercent !== undefined ? t.revenueSharePercent : 70}%
                    </span>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-2 text-center">
                    <span className="block text-[10px] text-muted-foreground font-bold uppercase">Wallet</span>
                    <span className="font-black text-emerald-600 text-sm">
                      €{(t.walletBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Assigned Batches */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Assigned Batches ({teacherBatches.length})</span>
                    <Link
                      href="/sccg/school/batches"
                      className="text-[#0F4C81] hover:underline normal-case text-[11px] font-semibold"
                    >
                      All Batches →
                    </Link>
                  </span>
                  {teacherBatches.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teacherBatches.map((b) => (
                        <Link
                          key={b.id}
                          href={`/sccg/school/batches/${b.id}`}
                          className="px-2 py-0.5 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] text-[11px] font-bold hover:bg-[#0F4C81]/20 transition-colors"
                        >
                          {b.batchCode || b.batchName}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No batches currently assigned</p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <Link
                  href="/sccg/school/batches"
                  className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" /> Assign to Batch
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setError(null);
                      setEditingTeacher(t);
                    }}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit Teacher"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Remove teacher ${t.name}?`)) {
                        try {
                          const res = await deleteTeacherAction(t.id);
                          if (res && !(res as any).success) {
                            alert((res as any).error || "Failed to delete teacher");
                            return;
                          }
                          setTeachers((prev) => prev.filter((item) => item.id !== t.id));
                        } catch (err: any) {
                          alert(err.message || "Failed to delete teacher");
                        }
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
                    title="Delete Teacher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTeachers.length === 0 && (
        <div className="py-16 text-center bg-card border border-dashed rounded-3xl p-8">
          <UserCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No Teachers Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Onboard instructors from the existing Expert Bank or register a new teacher directly.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => openAddModal("expert")}
              className="bg-[#0F4C81] text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Onboard from Expert Bank
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Add Teacher / Onboard from Expert ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                {addMode === "expert" ? (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-500" /> Onboard Teacher from Expert
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5 text-[#0F4C81]" /> Add Teacher Directly
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="grid grid-cols-2 p-1 bg-muted rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddMode("expert")}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  addMode === "expert" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> From Expert Bank
              </button>
              <button
                type="button"
                onClick={() => setAddMode("direct")}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  addMode === "direct" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-[#0F4C81]" /> Direct Add
              </button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  const res = await createTeacherAction(fd);
                  if (res && !(res as any).success) {
                    setError((res as any).error || "Failed to add teacher");
                    return;
                  }
                  setShowAddModal(false);
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message || "Failed to add teacher");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3.5 text-sm"
            >
              <input type="hidden" name="expertId" value={addMode === "expert" && selectedExpert ? (selectedExpert.expertId || selectedExpert.id) : ""} />

              {/* Expert Selection Dropdown (Only in expert mode) */}
              {addMode === "expert" && (
                <div className="bg-[#0F4C81]/5 border border-[#0F4C81]/20 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-[#0F4C81] uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Select Existing Expert
                    </label>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {availableExperts.length} onboarded
                    </span>
                  </div>

                  {/* Searchable input */}
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={expertSearch}
                        onChange={(e) => {
                          setExpertSearch(e.target.value);
                          setIsExpertDropdownOpen(true);
                        }}
                        onFocus={() => setIsExpertDropdownOpen(true)}
                        placeholder="Search expert by name, email, or specialization..."
                        className="w-full h-10 pl-9 pr-8 rounded-xl border-2 border-[#0F4C81]/30 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                      />
                      {expertSearch ? (
                        <button
                          type="button"
                          onClick={() => {
                            setExpertSearch("");
                            setIsExpertDropdownOpen(true);
                          }}
                          className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 text-muted-foreground pointer-events-none" />
                      )}
                    </div>

                    {isExpertDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl z-20 divide-y divide-border">
                        {filteredExperts.length > 0 ? (
                          filteredExperts.map((exp) => (
                            <button
                              key={exp.id}
                              type="button"
                              onClick={() => handleSelectExpert(exp.id)}
                              className="w-full text-left p-2.5 hover:bg-muted/70 transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground truncate">{exp.name}</span>
                                  {exp.source && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      exp.source === "Service Expert"
                                        ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                        : "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                                    }`}>
                                      {exp.source}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5 truncate">
                                  {exp.email && (
                                    <span className="truncate">{exp.email}</span>
                                  )}
                                  {exp.specialization && (
                                    <span className="truncate text-muted-foreground/80">• {exp.specialization}</span>
                                  )}
                                </div>
                              </div>
                              {selectedExpertId === exp.id ? (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <span className="text-[11px] text-[#0F4C81] font-bold shrink-0 hover:underline">Select</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No experts found matching &quot;{expertSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Expert Pill */}
                  {selectedExpert && (
                    <div className="p-2.5 rounded-xl bg-[#0F4C81]/10 border border-[#0F4C81]/20 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-foreground">{selectedExpert.name}</span>
                          <span className="text-muted-foreground ml-1.5">({selectedExpert.email || "No email"})</span>
                          <span className="text-muted-foreground ml-1.5">— {selectedExpert.specialization}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedExpert}
                        className="text-xs text-muted-foreground hover:text-red-600 font-bold p-1"
                        title="Clear selected expert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    Selecting an expert automatically links their profile and populates full name, email, phone, and specialization.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name *</label>
                <input
                  required
                  name="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. Maria Schmidt"
                  className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    name="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="teacher@example.com"
                    className="w-full h-10 px-3 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    name="phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+49 170 1234567"
                    className="w-full h-10 px-3 rounded-xl border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Specialization</label>
                  <input
                    name="specialization"
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    placeholder="Deutsch als Fremdsprache (DaF)"
                    className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Language</label>
                  <input
                    name="language"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    placeholder="German"
                    className="w-full h-10 px-3 rounded-xl border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Role Category</label>
                  <select
                    name="roleCategory"
                    value={formRole}
                    onChange={(e) => {
                      const r = e.target.value as SchoolTeamRole;
                      setFormRole(r);
                      setFormRevenueShare(r === "coordinator" ? 5 : r === "instructor" ? 70 : 0);
                    }}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                  >
                    <option value="instructor">Instructor (Lead Teacher)</option>
                    <option value="leader">Language Lead / Head</option>
                    <option value="coordinator">Batch Coordinator</option>
                    <option value="staff">School Support Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Revenue Share %</label>
                  <input
                    name="revenueSharePercent"
                    type="number"
                    min="0"
                    max="100"
                    value={formRevenueShare}
                    onChange={(e) => setFormRevenueShare(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 h-10 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors"
                >
                  {loading ? "Adding..." : addMode === "expert" ? "Onboard Expert as Teacher" : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Teacher ── */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#0F4C81]" /> Edit Instructor
              </h3>
              <button
                onClick={() => setEditingTeacher(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  const res = await updateTeacherAction(editingTeacher.id, fd);
                  if (res && !(res as any).success) {
                    setError((res as any).error || "Failed to update teacher");
                    return;
                  }
                  setEditingTeacher(null);
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message || "Failed to update teacher");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name *</label>
                <input
                  required
                  name="name"
                  defaultValue={editingTeacher.name}
                  className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Phone</label>
                <input
                  name="phone"
                  defaultValue={editingTeacher.phone || ""}
                  className="w-full h-10 px-3 rounded-xl border bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Specialization</label>
                <input
                  name="specialization"
                  defaultValue={editingTeacher.specialization || ""}
                  className="w-full h-10 px-3 rounded-xl border bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Revenue Share %</label>
                  <input
                    name="revenueSharePercent"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingTeacher.revenueSharePercent !== undefined ? editingTeacher.revenueSharePercent : 70}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingTeacher.status}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="w-1/2 h-10 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors"
                >
                  {loading ? "Saving..." : "Update Instructor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
