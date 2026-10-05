"use client";

import { useState, useMemo, useTransition } from "react";
import {
  GraduationCap,
  Users,
  Search,
  Plus,
  Download,
  Upload,
  UserCheck,
  Building2,
  Video,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Eye,
  Trash2,
  Globe,
  Phone,
  Mail,
  Briefcase,
  Star,
  ChevronRight,
  Loader2,
  X,
  Edit2,
} from "lucide-react";
import type { UnifiedExpertRecord } from "./actions";
import { createNewExpertAction, deleteExpertAction } from "./actions";
import ExpertDetailDrawer from "./ExpertDetailDrawer";
import ExpertImportModal from "./ExpertImportModal";

interface ExpertsClientProps {
  initialExperts: UnifiedExpertRecord[];
  stats: {
    totalExperts: number;
    serviceExpertsCount: number;
    projectExpertsCount: number;
    totalSessionsCount: number;
    completedSessionsCount: number;
    totalPaidEur: number;
    totalPendingEur: number;
  };
}

export default function ExpertsClient({
  initialExperts,
  stats,
}: ExpertsClientProps) {
  const [experts, setExperts] = useState<UnifiedExpertRecord[]>(initialExperts);
  const [activeTab, setActiveTab] = useState<"directory" | "sessions" | "payments">("directory");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "service" | "project">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Drawers & Modals
  const [selectedExpert, setSelectedExpert] = useState<UnifiedExpertRecord | null>(null);
  const [initialEditMode, setInitialEditMode] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddExpertOpen, setIsAddExpertOpen] = useState(false);

  const handleDeleteClick = async (expert: UnifiedExpertRecord) => {
    if (!confirm(`Are you sure you want to delete expert "${expert.name}"?`)) return;
    const res = await deleteExpertAction(expert.id, expert.expertType);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete expert.");
    }
  };

  // New Expert Form State
  const [newExpertForm, setNewExpertForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "German Language Coach",
    expertType: "service" as "service" | "project",
    ratePerSession: 50,
    nationality: "German",
    currentLocation: "Germany",
    bio: "",
    tags: "",
  });
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  // Filtered Experts
  const filteredExperts = useMemo(() => {
    return experts.filter((e) => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (e.name || "").toLowerCase().includes(q);
        const matchEmail = (e.email || "").toLowerCase().includes(q);
        const matchPhone = (e.phone || "").toLowerCase().includes(q);
        const matchSpec = (e.specialization || "").toLowerCase().includes(q);
        const matchLoc = (e.currentLocation || "").toLowerCase().includes(q);
        const matchNat = (e.nationality || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchSpec && !matchLoc && !matchNat) {
          return false;
        }
      }

      // 2. Type Filter
      if (typeFilter === "service" && e.expertType !== "service") return false;
      if (typeFilter === "project" && e.expertType !== "project") return false;

      // 3. Status Filter
      if (statusFilter !== "all" && e.status !== statusFilter) return false;

      return true;
    });
  }, [experts, searchQuery, typeFilter, statusFilter]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "Expert Name",
      "Expert Type",
      "Email",
      "Phone",
      "Specialization",
      "Nationality",
      "Location",
      "Rate Per Session (€)",
      "Completed Sessions",
      "Total Earnings (€)",
      "Status",
      "Created Date",
    ];

    const rows = filteredExperts.map((e) => [
      `"${e.name.replace(/"/g, '""')}"`,
      `"${e.expertType === "service" ? "Service Expert / Coach" : "Project Consultant"}"`,
      `"${e.email}"`,
      `"${e.phone || ""}"`,
      `"${(e.specialization || "").replace(/"/g, '""')}"`,
      `"${e.nationality || ""}"`,
      `"${e.currentLocation || ""}"`,
      e.ratePerSession || 0,
      e.completedSessions || 0,
      e.totalEarningsEur || 0,
      `"${e.status || "active"}"`,
      `"${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sccg_central_experts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateExpertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    startCreating(async () => {
      const res = await createNewExpertAction({
        name: newExpertForm.name,
        email: newExpertForm.email,
        phone: newExpertForm.phone,
        specialization: newExpertForm.specialization,
        expertType: newExpertForm.expertType,
        ratePerSession: Number(newExpertForm.ratePerSession) || 0,
        nationality: newExpertForm.nationality,
        currentLocation: newExpertForm.currentLocation,
        bio: newExpertForm.bio,
        tags: newExpertForm.tags,
      });

      if (res.success) {
        setIsAddExpertOpen(false);
        window.location.reload();
      } else {
        setCreateError(res.error || "Failed to create expert.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Central Experts Hub</h1>
              <p className="text-xs text-muted-foreground">
                Unified roster of Service Experts (mentors, teachers, coaches) and Project Consultants with session & payout tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
          >
            <Upload className="h-4 w-4 text-primary" />
            Import CSV List
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            Export CSV ({filteredExperts.length})
          </button>

          <button
            onClick={() => setIsAddExpertOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Register Expert
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground block">Total Experts</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.totalExperts}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Unified Pool</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 block">Service Experts</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.serviceExpertsCount}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Coaches & Teachers</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">Project Experts</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.projectExpertsCount}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">B2B Consultants</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Sessions Delivered</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.completedSessionsCount}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Completed Sessions</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 block">Total Payouts Paid</span>
          <span className="text-xl font-bold text-foreground mt-1 block">€{stats.totalPaidEur.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Disbursed Earnings</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">Pending Payouts</span>
          <span className="text-xl font-bold text-foreground mt-1 block">€{stats.totalPendingEur.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Eligible / Approval</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "directory"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Central Expert Directory
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {stats.totalExperts}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "sessions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className="h-4 w-4" />
            Delivered Sessions History
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              {stats.completedSessionsCount} sessions
            </span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "payments"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Financial & Payment Ledger
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Type Filter Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by expert name, email, phone, specialization, location..."
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Experts
          </button>

          <button
            onClick={() => setTypeFilter("service")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === "service"
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Service Experts / Coaches ({stats.serviceExpertsCount})
          </button>

          <button
            onClick={() => setTypeFilter("project")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === "project"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Project Consultants ({stats.projectExpertsCount})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CENTRAL DIRECTORY TAB                                                  */}
      {/* ========================================================================= */}
      {activeTab === "directory" && (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Expert Name & Type</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Specialization / Role</th>
                  <th className="p-3.5">Rate Per Session</th>
                  <th className="p-3.5">Location / Nationality</th>
                  <th className="p-3.5">Sessions / Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExperts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No experts found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredExperts.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => {
                        setSelectedExpert(e);
                        setInitialEditMode(false);
                      }}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 font-bold text-sm group-hover:scale-105 transition-transform">
                            {e.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block group-hover:text-primary transition-colors">
                              {e.name}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase mt-0.5 ${
                                e.expertType === "service"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {e.expertType === "service" ? "Service Coach" : "Project Consultant"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{e.email}</span>
                          </div>
                          {e.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{e.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-medium text-foreground">
                        {e.specialization}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-foreground">
                        {e.ratePerSession ? `€${e.ratePerSession}` : "Project-based"}
                      </td>

                      <td className="p-3.5">
                        <span className="text-foreground block font-medium">{e.currentLocation || "Germany"}</span>
                        <span className="text-[10px] text-muted-foreground">{e.nationality || "International"}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            {e.completedSessions} delivered
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize">
                            {e.status}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Details"
                            onClick={(eBtn) => {
                              eBtn.stopPropagation();
                              setSelectedExpert(e);
                              setInitialEditMode(false);
                            }}
                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title="Edit"
                            onClick={(eBtn) => {
                              eBtn.stopPropagation();
                              setSelectedExpert(e);
                              setInitialEditMode(true);
                            }}
                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={(eBtn) => {
                              eBtn.stopPropagation();
                              handleDeleteClick(e);
                            }}
                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SESSIONS HISTORY TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === "sessions" && (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Expert Name</th>
                  <th className="p-3.5">Total Sessions Logged</th>
                  <th className="p-3.5">Completed Sessions</th>
                  <th className="p-3.5">Upcoming / Scheduled</th>
                  <th className="p-3.5">Session Rate</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExperts
                  .filter((e) => e.expertType === "service")
                  .map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedExpert(e)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-5">
                        <span className="font-bold text-foreground block">{e.name}</span>
                        <span className="text-[10px] text-muted-foreground">{e.email} • {e.specialization}</span>
                      </td>

                      <td className="p-3.5 font-bold text-foreground">
                        {e.totalSessions} sessions
                      </td>

                      <td className="p-3.5">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                          {e.completedSessions} completed
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-600">
                          {e.upcomingSessions} scheduled
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-foreground">
                        €{e.ratePerSession}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={(eBtn) => {
                            eBtn.stopPropagation();
                            setSelectedExpert(e);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                        >
                          View Sessions
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FINANCIAL & PAYMENT LEDGER TAB                                         */}
      {/* ========================================================================= */}
      {activeTab === "payments" && (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Expert Name</th>
                  <th className="p-3.5">Rate / Session</th>
                  <th className="p-3.5">Completed Sessions</th>
                  <th className="p-3.5">Total Paid Out</th>
                  <th className="p-3.5">Pending Payouts</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExperts
                  .filter((e) => e.expertType === "service")
                  .map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedExpert(e)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-5">
                        <span className="font-bold text-foreground block">{e.name}</span>
                        <span className="text-[10px] text-muted-foreground">{e.email}</span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-foreground">
                        €{e.ratePerSession}
                      </td>

                      <td className="p-3.5 font-medium text-foreground">
                        {e.completedSessions} sessions
                      </td>

                      <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        €{e.totalEarningsEur.toLocaleString()}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                        €{e.pendingEarningsEur.toLocaleString()}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={(eBtn) => {
                            eBtn.stopPropagation();
                            setSelectedExpert(e);
                          }}
                          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      <ExpertDetailDrawer
        expert={selectedExpert}
        onClose={() => {
          setSelectedExpert(null);
          setInitialEditMode(false);
        }}
        onExpertUpdated={() => window.location.reload()}
        initialEditMode={initialEditMode}
      />

      {/* CSV Import Modal */}
      <ExpertImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          window.location.reload();
        }}
      />

      {/* Register Expert Modal */}
      {isAddExpertOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in-0 overflow-y-auto">
          <form
            onSubmit={handleCreateExpertSubmit}
            className="flex h-full max-h-[88vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Register New Expert</h2>
                  <p className="text-xs text-muted-foreground">Add a Service Coach or Project Consultant.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExpertOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {createError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600">
                  {createError}
                </div>
              )}

              {/* Expert Type Selector */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Expert Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewExpertForm({ ...newExpertForm, expertType: "service" })}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      newExpertForm.expertType === "service"
                        ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Service Expert / Coach
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewExpertForm({ ...newExpertForm, expertType: "project" })}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      newExpertForm.expertType === "project"
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Project Consultant
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-foreground block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newExpertForm.name}
                    onChange={(e) => setNewExpertForm({ ...newExpertForm, name: e.target.value })}
                    placeholder="e.g. Dr. Thomas Becker"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newExpertForm.email}
                    onChange={(e) => setNewExpertForm({ ...newExpertForm, email: e.target.value })}
                    placeholder="expert@mysccg.de"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newExpertForm.phone}
                    onChange={(e) => setNewExpertForm({ ...newExpertForm, phone: e.target.value })}
                    placeholder="+49 151 000000"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Specialization / Role *</label>
                  <input
                    type="text"
                    required
                    value={newExpertForm.specialization}
                    onChange={(e) => setNewExpertForm({ ...newExpertForm, specialization: e.target.value })}
                    placeholder="e.g. German Language Instructor"
                    className="input w-full"
                  />
                </div>

                {newExpertForm.expertType === "service" ? (
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Rate Per Session (€)</label>
                    <input
                      type="number"
                      value={newExpertForm.ratePerSession}
                      onChange={(e) => setNewExpertForm({ ...newExpertForm, ratePerSession: Number(e.target.value) })}
                      className="input w-full font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Tags / Focus Areas</label>
                    <input
                      type="text"
                      value={newExpertForm.tags}
                      onChange={(e) => setNewExpertForm({ ...newExpertForm, tags: e.target.value })}
                      placeholder="e.g. Health, Nursing, EU"
                      className="input w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Nationality</label>
                  <input
                    type="text"
                    value={newExpertForm.nationality}
                    onChange={(e) => setNewExpertForm({ ...newExpertForm, nationality: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Current Location</label>
                  <input
                    type="text"
                    value={newExpertForm.currentLocation}
                    onChange={(e) => setNewExpertForm({ ...newExpertForm, currentLocation: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-foreground block mb-1">Bio / Profile Overview</label>
                  <textarea
                    rows={3}
                    value={newExpertForm.bio}
                    onChange={(e) => setNewExpertForm({ ...newExpertForm, bio: e.target.value })}
                    placeholder="Brief background summary and credentials..."
                    className="input w-full py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20">
              <button
                type="button"
                onClick={() => setIsAddExpertOpen(false)}
                className="rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Expert Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
