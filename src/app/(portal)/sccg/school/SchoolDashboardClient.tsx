"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Euro,
  GraduationCap,
  Hourglass,
  Layers,
  Plus,
  TrendingUp,
  UserCheck,
  Users,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { SchoolBatch, SchoolCertificate, SchoolCourse, SchoolEnrollment, SchoolTeacher } from "@/types";
import {
  createBatchAction,
  createCourseAction,
  registerStudentAction,
  updateEnrollmentPaymentStatusAction,
} from "./actions";

interface SchoolDashboardClientProps {
  kpis: {
    totalStudents: number;
    activeBatches: number;
    waitingListStudents: number;
    totalRevenue: number;
    completedBatches: number;
    outstandingPayments: number;
    pendingPaymentsCount: number;
  };
  courses: SchoolCourse[];
  batches: SchoolBatch[];
  enrollments: SchoolEnrollment[];
  certificates: SchoolCertificate[];
  teachers: SchoolTeacher[];
  levelCounts: Record<string, number>;
}

export default function SchoolDashboardClient({
  kpis,
  courses,
  batches,
  enrollments,
  certificates,
  teachers,
  levelCounts,
}: SchoolDashboardClientProps) {
  const [activeModal, setActiveModal] = useState<"register" | "course" | "batch" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revenue Breakdown calculations
  const teacherShareTotal = Math.round(kpis.totalRevenue * 0.7);
  const coordinatorShareTotal = Math.round(kpis.totalRevenue * 0.05);
  const sccgShareTotal = kpis.totalRevenue - teacherShareTotal - coordinatorShareTotal;

  // Upcoming batches
  const upcomingBatches = batches
    .filter((b) => ["planned", "running", "enrollment-open"].includes(b.status))
    .slice(0, 4);

  // Pending Payments
  const pendingPaymentsList = enrollments
    .filter((e) => e.paymentStatus === "pending" || e.paymentStatus === "unpaid")
    .slice(0, 5);

  return (
    <div className="space-y-7 max-w-7xl mx-auto page-enter pb-10">
      {/* ── Brand Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0F4C81] via-[#1A5F9E] to-[#0F4C81] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#F5B800] text-slate-950 flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> SCCG German Language School
            </span>
            <span className="text-white/70 text-xs font-semibold">CEFR Certified A1–C1 CRM</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Language School Operations
          </h1>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Live cohort monitoring, student enrollments, waiting list automation, and 70/5/25 revenue split wallet management.
          </p>
        </div>

        {/* Quick Actions in Header */}
        <div className="relative z-10 flex flex-wrap gap-2.5">
          <button
            onClick={() => { setError(null); setActiveModal("register"); }}
            className="flex items-center gap-2 bg-[#F5B800] hover:bg-[#E5AA00] text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" /> Register Student
          </button>
          <button
            onClick={() => { setError(null); setActiveModal("batch"); }}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all backdrop-blur-sm active:scale-95"
          >
            <Layers className="w-4 h-4" /> Create Batch
          </button>
          <button
            onClick={() => { setError(null); setActiveModal("course"); }}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all backdrop-blur-sm active:scale-95"
          >
            <BookOpen className="w-4 h-4" /> Add Course
          </button>
        </div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Students */}
        <Link
          href="/sccg/school/students"
          className="bg-card hover:bg-card/90 border border-border/80 hover:border-[#0F4C81]/50 p-5 rounded-2xl transition-all shadow-sm group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#60A5FA]">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Students</span>
          </div>
          <div className="text-2xl font-black text-foreground">{kpis.totalStudents}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Enrolled & Active</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#0F4C81] ml-auto" />
          </p>
        </Link>

        {/* 2. Active Batches */}
        <Link
          href="/sccg/school/batches"
          className="bg-card hover:bg-card/90 border border-border/80 hover:border-emerald-500/50 p-5 rounded-2xl transition-all shadow-sm group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Running
            </span>
          </div>
          <div className="text-2xl font-black text-foreground">{kpis.activeBatches}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Active Cohorts</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 ml-auto" />
          </p>
        </Link>

        {/* 3. Waiting List Students */}
        <Link
          href="/sccg/school/waiting-list"
          className="bg-card hover:bg-card/90 border border-border/80 hover:border-[#F5B800]/50 p-5 rounded-2xl transition-all shadow-sm group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-[#F5B800]/20 text-amber-700 dark:text-amber-400">
              <Hourglass className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
              Pending
            </span>
          </div>
          <div className="text-2xl font-black text-foreground">{kpis.waitingListStudents}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Ready for Batch</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 ml-auto" />
          </p>
        </Link>

        {/* 4. Total Revenue */}
        <div className="bg-card border border-border/80 p-5 rounded-2xl transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#60A5FA]">
              <Euro className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Revenue</span>
          </div>
          <div className="text-2xl font-black text-foreground">€{kpis.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Gross Enrollment Fee</p>
        </div>

        {/* 5. Completed Batches */}
        <Link
          href="/sccg/school/batches"
          className="bg-card hover:bg-card/90 border border-border/80 hover:border-emerald-500/50 p-5 rounded-2xl transition-all shadow-sm group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Finished
            </span>
          </div>
          <div className="text-2xl font-black text-foreground">{kpis.completedBatches}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Graduated Cohorts</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 ml-auto" />
          </p>
        </Link>

        {/* 6. Outstanding Payments */}
        <div className="bg-card border border-border/80 p-5 rounded-2xl transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400">
              Due
            </span>
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">€{kpis.outstandingPayments.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">{kpis.pendingPaymentsCount} pending invoices</p>
        </div>
      </div>

      {/* ── Quick Navigation Ribbon ── */}
      <div className="flex flex-wrap gap-2.5">
        <Link
          href="/sccg/school/courses"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-[#0F4C81] text-xs font-bold text-foreground transition-all hover:shadow-sm"
        >
          <BookOpen className="w-4 h-4 text-[#0F4C81]" /> All Courses ({courses.length})
        </Link>
        <Link
          href="/sccg/school/batches"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-[#0F4C81] text-xs font-bold text-foreground transition-all hover:shadow-sm"
        >
          <Layers className="w-4 h-4 text-[#0F4C81]" /> Batch Manager ({batches.length})
        </Link>
        <Link
          href="/sccg/school/students"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-[#0F4C81] text-xs font-bold text-foreground transition-all hover:shadow-sm"
        >
          <Users className="w-4 h-4 text-[#0F4C81]" /> Student Directory ({enrollments.length})
        </Link>
        <Link
          href="/sccg/school/waiting-list"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-amber-500 text-xs font-bold text-foreground transition-all hover:shadow-sm"
        >
          <Hourglass className="w-4 h-4 text-amber-500" /> Smart Waiting List ({kpis.waitingListStudents})
        </Link>
        <Link
          href="/sccg/school/team"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-[#0F4C81] text-xs font-bold text-foreground transition-all hover:shadow-sm"
        >
          <UserCheck className="w-4 h-4 text-[#0F4C81]" /> Language Team & Wallets ({teachers.length})
        </Link>
        <Link
          href="/sccg/school/certificates"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-[#F5B800] text-xs font-bold text-foreground transition-all hover:shadow-sm"
        >
          <Award className="w-4 h-4 text-[#F5B800]" /> Certificate Hub ({certificates.length})
        </Link>
      </div>

      {/* ── 4 Main Widgets Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Widget 1: Revenue Split & Financial Overview */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Revenue Split Distribution</h2>
                <p className="text-xs text-muted-foreground">Automated 70% Instructor / 5% Coordinator / 25% SCCG model</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#0F4C81] bg-[#0F4C81]/10 px-2.5 py-1 rounded-full">
              €{kpis.totalRevenue.toLocaleString()} Gross
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-2xl">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">👨🏫 Instructors (70%)</span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">€{teacherShareTotal.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Credited on Batch Complete</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">👨💼 Coordinator (5%)</span>
              <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">€{coordinatorShareTotal.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Team Support Share</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">🏢 SCCG Share (25%)</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">€{sccgShareTotal.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Lab Operations</p>
            </div>
          </div>

          {/* Revenue split visual bar */}
          <div className="space-y-1.5">
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
              <div className="bg-blue-600 transition-all" style={{ width: "70%" }} title="Instructors 70%" />
              <div className="bg-amber-500 transition-all" style={{ width: "5%" }} title="Coordinators 5%" />
              <div className="bg-emerald-600 transition-all" style={{ width: "25%" }} title="SCCG 25%" />
            </div>
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground px-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Instructor 70%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Coordinator 5%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> SCCG 25%</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Student Growth & Level Distribution */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#F5B800]/20 text-amber-700 dark:text-amber-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">German CEFR Level Distribution</h2>
                <p className="text-xs text-muted-foreground">Breakdown of students across standard levels</p>
              </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground">A1 to C1</span>
          </div>

          <div className="space-y-3 pt-1">
            {(["A1", "A2", "B1", "B2", "C1"] as const).map((lvl) => {
              const count = levelCounts[lvl] || 0;
              const percent = kpis.totalStudents > 0 ? Math.round((count / kpis.totalStudents) * 100) : 0;
              return (
                <div key={lvl} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="w-6 text-center px-1.5 py-0.5 rounded bg-muted text-[10px] font-black">{lvl}</span>
                      <span>German {lvl}</span>
                    </span>
                    <span className="text-muted-foreground">{count} Students ({percent}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0F4C81] to-[#F5B800] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percent, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 3: Upcoming & Active Batches */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Upcoming & Running Batches</h2>
                <p className="text-xs text-muted-foreground">Active cohorts with capacity tracking</p>
              </div>
            </div>
            <Link href="/sccg/school/batches" className="text-xs font-bold text-[#0F4C81] hover:underline">
              View All →
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {upcomingBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No active batches yet. Create your first batch.</p>
            ) : (
              upcomingBatches.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">{b.batchName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === "running" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-700"
                      }`}>
                        {b.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.courseName} · 👨🏫 {b.teacherName} {b.coordinatorName ? `· 👨💼 ${b.coordinatorName}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-foreground">
                      {b.enrolledStudents}/{b.maxStudents} seats
                    </div>
                    <Link
                      href={`/sccg/school/batches/${b.id}`}
                      className="text-[11px] font-bold text-[#0F4C81] hover:underline inline-flex items-center gap-0.5 mt-0.5"
                    >
                      Manage <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 4: Pending Payments */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Pending Student Payments</h2>
                <p className="text-xs text-muted-foreground">Invoices awaiting fee collection</p>
              </div>
            </div>
            <Link href="/sccg/school/students" className="text-xs font-bold text-[#0F4C81] hover:underline">
              All Students →
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {pendingPaymentsList.length === 0 ? (
              <div className="py-6 text-center text-sm text-emerald-600 font-medium">
                ✅ All student payments are currently up to date.
              </div>
            ) : (
              pendingPaymentsList.map((e) => (
                <div key={e.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{e.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.courseName || e.batchCode || "German Course"} · {e.studentEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-red-600">
                      €{(e.amountRemaining || e.netFee || e.totalFee || 500).toLocaleString()}
                    </span>
                    <button
                      onClick={async () => {
                        await updateEnrollmentPaymentStatusAction(e.id, "paid");
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Modal: Register Student ── */}
      {activeModal === "register" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0F4C81]" /> Register New Student
              </h3>
              <button
                onClick={() => setActiveModal(null)}
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
                  await registerStudentAction(fd);
                  setActiveModal(null);
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
                <input required name="studentName" placeholder="e.g. Max Mustermann" className="w-full h-10 px-3 rounded-xl border bg-background" />
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
                  <select name="desiredLevel" defaultValue="A1" className="w-full h-10 px-3 rounded-xl border bg-background">
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
                    <option value="waiting-list">Put On Waiting List</option>
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
                <textarea name="remarks" rows={2} placeholder="Optional notes regarding student placement..." className="w-full p-2.5 rounded-xl border bg-background text-xs" />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-1/2 h-10 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors"
                >
                  {loading ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create Course ── */}
      {activeModal === "course" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0F4C81]" /> Add German Course
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  await createCourseAction(fd);
                  setActiveModal(null);
                } catch (err: any) {
                  setError(err.message || "Failed to create course");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Course Name *</label>
                <input required name="courseName" defaultValue="German A1 Beginner Intensive" className="w-full h-10 px-3 rounded-xl border bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Course Code *</label>
                  <input required name="courseCode" defaultValue="GER-A1" className="w-full h-10 px-3 rounded-xl border bg-background uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">CEFR Level *</label>
                  <select name="level" defaultValue="A1" className="w-full h-10 px-3 rounded-xl border bg-background font-bold">
                    <option value="A1">A1 German</option>
                    <option value="A2">A2 German</option>
                    <option value="B1">B1 German</option>
                    <option value="B2">B2 German</option>
                    <option value="C1">C1 German</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Fee (€) *</label>
                  <input required name="courseFee" type="number" defaultValue="500" className="w-full h-10 px-3 rounded-xl border bg-background font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Sessions</label>
                  <input name="totalSessions" type="number" defaultValue="24" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Weeks</label>
                  <input name="totalDurationWeeks" type="number" defaultValue="8" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Description</label>
                <textarea name="description" rows={2} placeholder="Course description..." className="w-full p-2.5 rounded-xl border bg-background text-xs" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors">
                  {loading ? "Saving..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create Batch ── */}
      {activeModal === "batch" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F4C81]" /> Create New Training Batch
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  await createBatchAction(fd);
                  setActiveModal(null);
                } catch (err: any) {
                  setError(err.message || "Failed to create batch");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Course *</label>
                <select required name="courseId" className="w-full h-10 px-3 rounded-xl border bg-background font-medium">
                  <option value="">-- Choose Course Level --</option>
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
                  <input required name="batchName" placeholder="e.g. A1 Morning Batch" className="w-full h-10 px-3 rounded-xl border bg-background" />
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
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Capacity (Students)</label>
                  <input name="maxStudents" type="number" defaultValue="20" min="1" className="w-full h-10 px-3 rounded-xl border bg-background font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Schedule</label>
                  <input name="schedule" defaultValue="Mon & Wed 18:00 - 19:30" className="w-full h-10 px-3 rounded-xl border bg-background" />
                </div>
              </div>

              {/* Automatic split preview note */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-blue-700 dark:text-blue-300">💰 Automated Financial Setup:</p>
                <p className="text-muted-foreground">70% Teacher · 5% Coordinator · 25% SCCG Lab</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="w-1/2 h-10 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors">
                  {loading ? "Creating..." : "Save Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
