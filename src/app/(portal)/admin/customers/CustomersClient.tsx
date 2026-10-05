"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  UserCheck,
  Building2,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Eye,
  Trash2,
  ArrowUpDown,
  FileSpreadsheet,
  Globe,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Loader2,
  X,
  Edit2,
} from "lucide-react";
import type { CustomerUnifiedRecord } from "./actions";
import { createNewCustomerAction, deleteCustomerAction } from "./actions";
import CustomerDetailDrawer from "./CustomerDetailDrawer";
import CustomerImportModal from "./CustomerImportModal";
import type { Partner } from "@/types";

interface CustomersClientProps {
  initialCustomers: CustomerUnifiedRecord[];
  partners: Partner[];
  stats: {
    totalCustomers: number;
    directSccg: number;
    partnerReferred: number;
    runningServicesCount: number;
    completedServicesCount: number;
    totalRevenue: number;
    totalDue: number;
  };
}

export default function CustomersClient({
  initialCustomers,
  partners,
  stats,
}: CustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerUnifiedRecord[]>(initialCustomers);
  const [activeTab, setActiveTab] = useState<"directory" | "services" | "payments">("directory");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "sccg" | "partner">("all");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");
  const [serviceStatusFilter, setServiceStatusFilter] = useState<"all" | "running" | "completed" | "none">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");

  // Drawers & Modals
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUnifiedRecord | null>(null);
  const [initialEditMode, setInitialEditMode] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const handleDeleteClick = async (customer: CustomerUnifiedRecord) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.fullName}"?`)) return;
    const res = await deleteCustomerAction(customer.id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete customer.");
    }
  };

  // New Customer Form State
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    nationality: "German",
    country: "Germany",
    passportNumber: "",
    source: "sccg" as "sccg" | "partner",
    partnerId: "",
    workflowCategory: "Training & Language",
    serviceName: "",
    totalServiceFee: 0,
    depositAmount: 0,
    paymentStatus: "pending" as any,
    notes: "",
  });
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  // Filtered list based on state
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.fullName || "").toLowerCase().includes(q);
        const matchId = (c.sccgId || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").toLowerCase().includes(q);
        const matchPassport = (c.passportNumber || "").toLowerCase().includes(q);
        const matchPartner = (c.partnerName || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchEmail && !matchPhone && !matchPassport && !matchPartner) {
          return false;
        }
      }

      // 2. Source Filter
      if (sourceFilter === "sccg" && c.source !== "sccg") return false;
      if (sourceFilter === "partner" && c.source !== "partner") return false;

      // 3. Specific Partner
      if (selectedPartnerId !== "all") {
        if (c.partnerId !== selectedPartnerId) return false;
      }

      // 4. Service Status Filter (for Tab 2)
      if (activeTab === "services" && serviceStatusFilter !== "all") {
        if (serviceStatusFilter === "running" && c.runningServices === 0) return false;
        if (serviceStatusFilter === "completed" && c.completedServices === 0) return false;
        if (serviceStatusFilter === "none" && c.services.length > 0) return false;
      }

      // 5. Payment Status Filter (for Tab 3)
      if (activeTab === "payments" && paymentStatusFilter !== "all") {
        if (c.paymentStatus !== paymentStatusFilter) return false;
      }

      return true;
    });
  }, [customers, searchQuery, sourceFilter, selectedPartnerId, serviceStatusFilter, paymentStatusFilter, activeTab]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "Customer ID",
      "Full Name",
      "Email",
      "Phone",
      "Nationality",
      "Country",
      "Passport Number",
      "Source",
      "Partner Name",
      "Workflow Category",
      "Payment Status",
      "Total Fee (€)",
      "Deposit Paid (€)",
      "Due Balance (€)",
      "Running Services",
      "Completed Services",
      "Registered Date",
    ];

    const rows = filteredCustomers.map((c) => [
      `"${c.sccgId}"`,
      `"${c.fullName.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone || ""}"`,
      `"${c.nationality || ""}"`,
      `"${c.country || ""}"`,
      `"${c.passportNumber || ""}"`,
      `"${c.source === "sccg" ? "Direct SCCG" : "Partner"}"`,
      `"${(c.partnerName || "").replace(/"/g, '""')}"`,
      `"${c.workflowCategory || ""}"`,
      `"${c.paymentStatus || ""}"`,
      c.totalServiceFee || 0,
      c.depositAmount || 0,
      c.dueAmount || 0,
      c.runningServices || 0,
      c.completedServices || 0,
      `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sccg_central_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    startCreating(async () => {
      const res = await createNewCustomerAction({
        fullName: newCustomerForm.fullName,
        email: newCustomerForm.email,
        phone: newCustomerForm.phone,
        nationality: newCustomerForm.nationality,
        country: newCustomerForm.country,
        passportNumber: newCustomerForm.passportNumber,
        source: newCustomerForm.source,
        partnerId: newCustomerForm.partnerId,
        workflowCategory: newCustomerForm.workflowCategory as any,
        serviceName: newCustomerForm.serviceName,
        totalServiceFee: Number(newCustomerForm.totalServiceFee) || 0,
        depositAmount: Number(newCustomerForm.depositAmount) || 0,
        paymentStatus: newCustomerForm.paymentStatus,
        notes: newCustomerForm.notes,
      });

      if (res.success && res.data) {
        setIsAddCustomerOpen(false);
        window.location.reload();
      } else {
        setCreateError(res.error || "Failed to create customer.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Central Customers Hub</h1>
              <p className="text-xs text-muted-foreground">
                Master customer registry, multi-source tracking (Direct SCCG & Partners), service lifecycle & financial ledger.
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
            Export CSV ({filteredCustomers.length})
          </button>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Register Customer
          </button>
        </div>
      </div>

      {/* Top KPI Metrics Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground block">Total Customers</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.totalCustomers}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Master Database</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Direct SCCG</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.directSccg}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Direct Inquiries</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">Partner Referred</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.partnerReferred}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">B2B Network</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">Running Services</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.runningServicesCount}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Active Programs</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 block">Completed Services</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">{stats.completedServicesCount}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Graduated / Placed</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">Total Due Balance</span>
          <span className="text-xl font-bold text-foreground mt-1 block">€{stats.totalDue.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">€{stats.totalRevenue.toLocaleString()} collected</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
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
            Central Customer Directory
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {stats.totalCustomers}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "services"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" />
            Purchased Services & Lifecycle
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              {stats.runningServicesCount} active
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
            Financial & Payment Health
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Source Filtering Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, SCCG ID, email, phone, passport, partner..."
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

        {/* Source Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setSourceFilter("all");
              setSelectedPartnerId("all");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sourceFilter === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Sources
          </button>

          <button
            onClick={() => {
              setSourceFilter("sccg");
              setSelectedPartnerId("all");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sourceFilter === "sccg"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Direct SCCG ({stats.directSccg})
          </button>

          <button
            onClick={() => setSourceFilter("partner")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sourceFilter === "partner"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Partner Referred ({stats.partnerReferred})
          </button>

          {/* Partner Selector Dropdown */}
          <select
            value={selectedPartnerId}
            onChange={(e) => {
              setSelectedPartnerId(e.target.value);
              if (e.target.value !== "all") setSourceFilter("partner");
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground cursor-pointer"
          >
            <option value="all">All Partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName || (p as any).name || p.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Specific Sub-Filters */}
      {activeTab === "services" && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Filter Service Status:</span>
          {(["all", "running", "completed", "none"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setServiceStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-colors cursor-pointer ${
                serviceStatusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "all" ? "All Services" : st}
            </button>
          ))}
        </div>
      )}

      {activeTab === "payments" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground">Filter Payment Status:</span>
          {["all", "fully-paid", "deposit-paid", "pending", "refunded"].map((st) => (
            <button
              key={st}
              onClick={() => setPaymentStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition-colors cursor-pointer ${
                paymentStatusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.replace("-", " ")}
            </button>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CENTRAL DIRECTORY TAB (Personal Details Only)                           */}
      {/* ========================================================================= */}
      {activeTab === "directory" && (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Customer Name & ID</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Nationality / Country</th>
                  <th className="p-3.5">Passport / NID</th>
                  <th className="p-3.5">Source Attribution</th>
                  <th className="p-3.5">Registered Date</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No customers found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setInitialEditMode(false);
                      }}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm group-hover:scale-105 transition-transform">
                            {c.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block group-hover:text-primary transition-colors">
                              {c.fullName}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                              {c.sccgId}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{c.email}</span>
                          </div>
                          {c.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground block">{c.nationality}</span>
                          <span className="text-[10px] text-muted-foreground">{c.country}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-medium text-foreground">
                          {c.passportNumber || c.nationalId || "—"}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            c.source === "sccg"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          <Building2 className="h-2.5 w-2.5" />
                          {c.source === "sccg" ? "Direct SCCG" : c.partnerName || "Partner"}
                        </span>
                      </td>

                      <td className="p-3.5 text-muted-foreground">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(c);
                              setInitialEditMode(false);
                            }}
                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(c);
                              setInitialEditMode(true);
                            }}
                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(c);
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
      {/* 2. PURCHASED SERVICES & LIFECYCLE TAB                                     */}
      {/* ========================================================================= */}
      {activeTab === "services" && (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Customer & Source</th>
                  <th className="p-3.5">Active / Purchased Services</th>
                  <th className="p-3.5">Service Status</th>
                  <th className="p-3.5">Fee & Value</th>
                  <th className="p-3.5">Workflow Track</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No customer services found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-5">
                        <span className="font-bold text-foreground block">{c.fullName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.sccgId} • {c.partnerName}</span>
                      </td>

                      <td className="p-3.5">
                        {c.services.length === 0 ? (
                          <span className="text-muted-foreground italic">No package assigned</span>
                        ) : (
                          <div className="space-y-1">
                            {c.services.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <Package className="h-3 w-3 text-primary shrink-0" />
                                <span className="font-medium text-foreground truncate max-w-xs">{s.serviceName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {c.runningServices} Running
                          </span>
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {c.completedServices} Done
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-bold text-foreground">
                          €{c.totalServiceFee.toLocaleString()}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                          {c.workflowCategory}
                        </span>
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                          View Services
                          <ChevronRight className="h-3 w-3" />
                        </button>
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
      {/* 3. FINANCIAL & PAYMENT HEALTH TAB                                         */}
      {/* ========================================================================= */}
      {activeTab === "payments" && (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Customer & ID</th>
                  <th className="p-3.5">Total Service Fee</th>
                  <th className="p-3.5">Amount Paid</th>
                  <th className="p-3.5">Due Balance</th>
                  <th className="p-3.5">Payment Status</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-5">
                        <span className="font-bold text-foreground block">{c.fullName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.sccgId}</span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-foreground">
                        €{c.totalServiceFee.toLocaleString()}
                      </td>

                      <td className="p-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        €{c.depositAmount.toLocaleString()}
                      </td>

                      <td className="p-3.5 font-mono font-semibold text-amber-600 dark:text-amber-400">
                        €{c.dueAmount.toLocaleString()}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            c.paymentStatus === "fully-paid"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : c.paymentStatus === "deposit-paid"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : c.paymentStatus === "refunded"
                              ? "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {c.paymentStatus.replace("-", " ")}
                        </span>
                      </td>

                      <td className="p-3.5 text-muted-foreground">
                        {c.paymentMethod || "Bank Transfer / Manual"}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                          }}
                          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          Manage Ledger
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Customer Detail Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        onClose={() => {
          setSelectedCustomer(null);
          setInitialEditMode(false);
        }}
        onCustomerUpdated={() => window.location.reload()}
        initialEditMode={initialEditMode}
      />

      {/* Customer Import Modal */}
      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          window.location.reload();
        }}
      />

      {/* Register New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in-0 overflow-y-auto">
          <form
            onSubmit={handleCreateCustomerSubmit}
            className="flex h-full max-h-[88vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Register New Customer</h2>
                  <p className="text-xs text-muted-foreground">Add a direct SCCG or partner candidate profile.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
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

              {/* Source Selection */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Customer Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCustomerForm({ ...newCustomerForm, source: "sccg", partnerId: "" })}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      newCustomerForm.source === "sccg"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Direct SCCG Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCustomerForm({ ...newCustomerForm, source: "partner" })}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      newCustomerForm.source === "partner"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Partner Referred
                  </button>
                </div>
              </div>

              {newCustomerForm.source === "partner" && (
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Select Partner</label>
                  <select
                    value={newCustomerForm.partnerId}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, partnerId: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">Choose Partner Organization...</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName || (p as any).name || p.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-foreground block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.fullName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })}
                    placeholder="e.g. Michael Schmidt"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    placeholder="customer@domain.com"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="+49 151 000000"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Nationality</label>
                  <input
                    type="text"
                    value={newCustomerForm.nationality}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, nationality: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Country</label>
                  <input
                    type="text"
                    value={newCustomerForm.country}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, country: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Initial Service Name</label>
                  <input
                    type="text"
                    value={newCustomerForm.serviceName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, serviceName: e.target.value })}
                    placeholder="e.g. German B2 Language Course"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Total Agreed Fee (€)</label>
                  <input
                    type="number"
                    value={newCustomerForm.totalServiceFee}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, totalServiceFee: Number(e.target.value) })}
                    className="input w-full font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20">
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
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
                Create Customer Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
