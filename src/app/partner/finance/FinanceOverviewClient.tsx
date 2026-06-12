"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, Users,
  Calendar, Filter, Search, Bell, CheckCircle2, Clock, AlertTriangle,
  CreditCard, FileText, RotateCcw, Target, ChevronDown, ChevronUp,
  Mail, Eye, BarChart3
} from "lucide-react";
import type { Candidate, Transaction } from "@/types";
import { sendPaymentReminderAction, sendPaymentConfirmationAction } from "./actions";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", LKR: "Rs",
  NPR: "₨", TRY: "₺",
};

interface Props {
  candidates: Candidate[];
  transactions: Transaction[];
  partnerName: string;
  partnerCompany: string;
  marginPercent: number;
  salesTarget: number;
  secondaryCurrency?: string;
  exchangeRate?: number;
}

type ViewMode = "monthly" | "cumulative";
type FilterStatus = "all" | "pending" | "deposit-paid" | "fully-paid" | "overdue";

/** Format EUR amount — EUR only */
function dual(eurAmount: number, _currency?: string, _rate?: number, _compact?: boolean): string {
  return `€${eurAmount.toLocaleString("en", { minimumFractionDigits: 0 })}`;
}

export default function FinanceOverviewClient({
  candidates, transactions, partnerName, partnerCompany, marginPercent, salesTarget,
  secondaryCurrency = "EUR", exchangeRate = 1,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [reminderSending, setReminderSending] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState<Set<string>>(new Set());
  const [confirmSending, setConfirmSending] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // === DERIVED DATA ===
  const now = new Date();
  const currentYear = now.getFullYear();

  // Available years from candidates
  const years = useMemo(() => {
    const yrs = new Set<string>();
    candidates.forEach((c) => {
      const yr = c.createdAt?.slice(0, 4);
      if (yr) yrs.add(yr);
    });
    yrs.add(String(currentYear));
    return Array.from(yrs).sort().reverse();
  }, [candidates, currentYear]);

  // Available months
  const months = useMemo(() => {
    const ms: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, i, 1);
      ms.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return ms;
  }, [currentYear]);

  // Filter candidates by period
  const periodCandidates = useMemo(() => {
    if (viewMode === "monthly") {
      return candidates.filter((c) => c.createdAt?.startsWith(selectedMonth));
    }
    return candidates.filter((c) => c.createdAt?.startsWith(selectedYear));
  }, [candidates, viewMode, selectedMonth, selectedYear]);

  // Filter by status and search
  const filteredCandidates = useMemo(() => {
    let list = filterStatus === "all"
      ? periodCandidates
      : filterStatus === "overdue"
        ? periodCandidates.filter((c) => c.paymentStatus !== "fully-paid" && c.paymentStatus !== "refunded" && (c.totalServiceFee || 0) > 0)
        : periodCandidates.filter((c) => c.paymentStatus === filterStatus);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        c.fullName.toLowerCase().includes(q) || c.sccgId?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [periodCandidates, filterStatus, searchQuery]);

  // === FINANCIAL CALCULATIONS ===
  const allTimeTotals = useMemo(() => {
    const totalSales = candidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
    const totalReceived = candidates.reduce((s, c) => s + (c.depositAmount || 0), 0);
    const totalPartnerShare = candidates.reduce((s, c) => s + (c.partnerShare || 0), 0);
    const totalSccgShare = candidates.reduce((s, c) => s + (c.sccgShare || 0), 0);
    const totalPaidToSccg = transactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
    return { totalSales, totalReceived, totalPartnerShare, totalSccgShare, totalPaidToSccg };
  }, [candidates, transactions]);

  const periodTotals = useMemo(() => {
    const totalSales = periodCandidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
    const totalReceived = periodCandidates.reduce((s, c) => s + (c.depositAmount || 0), 0);
    const totalPartnerShare = periodCandidates.reduce((s, c) => s + (c.partnerShare || 0), 0);
    const totalSccgShare = periodCandidates.reduce((s, c) => s + (c.sccgShare || 0), 0);
    const clientsDue = periodCandidates.filter((c) => c.paymentStatus !== "fully-paid" && c.paymentStatus !== "refunded" && (c.totalServiceFee || 0) > 0).length;
    const clientsPaid = periodCandidates.filter((c) => c.paymentStatus === "fully-paid").length;
    return { totalSales, totalReceived, totalPartnerShare, totalSccgShare, clientsDue, clientsPaid };
  }, [periodCandidates]);

  const outstandingToSccg = Math.max(0, allTimeTotals.totalSccgShare - allTimeTotals.totalPaidToSccg);
  const targetProgress = salesTarget > 0 ? Math.min(100, (allTimeTotals.totalSales / salesTarget) * 100) : 0;

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    const data: { month: string; label: string; sales: number; received: number; partnerShare: number; sccgShare: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(parseInt(selectedYear), i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mc = candidates.filter((c) => c.createdAt?.startsWith(key));
      data.push({
        month: key,
        label: d.toLocaleString("en", { month: "short" }),
        sales: mc.reduce((s, c) => s + (c.totalServiceFee || 0), 0),
        received: mc.reduce((s, c) => s + (c.depositAmount || 0), 0),
        partnerShare: mc.reduce((s, c) => s + (c.partnerShare || 0), 0),
        sccgShare: mc.reduce((s, c) => s + (c.sccgShare || 0), 0),
      });
    }
    return data;
  }, [candidates, selectedYear]);

  const maxChartValue = Math.max(...monthlyChartData.map((m) => m.sales), 1);

  // Transaction history for a client
  const clientTransactions = (clientId: string) =>
    transactions.filter((t) => t.clientId === clientId).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // === HANDLERS ===
  async function handleSendReminder(c: Candidate) {
    const due = (c.totalServiceFee || 0) - (c.depositAmount || 0);
    if (due <= 0 || !c.email) return;
    setReminderSending(c.id);
    try {
      await sendPaymentReminderAction(c.id, c.fullName, c.email, due);
      setReminderSent((prev) => new Set(prev).add(c.id));
    } catch { /* ignore */ }
    finally { setReminderSending(null); }
  }

  async function handleSendConfirmation(c: Candidate, t: Transaction) {
    if (!c.email) return;
    setConfirmSending(t.id);
    try {
      await sendPaymentConfirmationAction(
        c.id,
        c.fullName,
        c.email,
        t.amount,
        t.paymentMethod || "Bank Transfer",
        c.serviceId || "SCCG Plan",
        t.date || new Date().toISOString()
      );
      setConfirmSent((prev) => new Set(prev).add(t.id));
    } catch { /* ignore */ }
    finally { setConfirmSending(null); }
  }

  const fmtMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString("en", { month: "long", year: "numeric" });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "deposit-paid": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "fully-paid": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    refunded: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      {/* ====== TOP KPI CARDS ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Total Sales</p>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-extrabold text-foreground mt-1">{dual(allTimeTotals.totalSales, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{candidates.length} clients total</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Received</p>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-500 mt-1">{dual(allTimeTotals.totalReceived, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">From clients</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/5 border-2 border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">Your Commission</p>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-extrabold text-purple-500 mt-1">{dual(allTimeTotals.totalPartnerShare, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{marginPercent}% margin</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-600/10 to-indigo-500/5 border-2 border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">SCCG Share</p>
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-extrabold text-indigo-500 mt-1">{dual(allTimeTotals.totalSccgShare, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{100 - marginPercent}% to SCCG</p>
        </div>
        <div className="bg-gradient-to-br from-amber-600/10 to-orange-500/5 border-2 border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Owe to SCCG</p>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-amber-500 mt-1">{dual(outstandingToSccg, secondaryCurrency, exchangeRate)}</p>
          <Link href="/partner/finance/payments" className="text-[10px] text-primary hover:underline mt-0.5 block">Make Payment →</Link>
        </div>
        <div className="bg-gradient-to-br from-rose-600/10 to-rose-500/5 border-2 border-rose-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-rose-400 uppercase tracking-wider font-bold">Client Dues</p>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-extrabold text-rose-500 mt-1">{dual(Math.max(0, allTimeTotals.totalSales - allTimeTotals.totalReceived), secondaryCurrency, exchangeRate)}</p>
          <Link href="/partner/finance/due-payments" className="text-[10px] text-primary hover:underline mt-0.5 block">View Due →</Link>
        </div>
      </div>

      {/* ====== SALES TARGET PROGRESS ====== */}
      {salesTarget > 0 && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground text-sm">Annual Sales Target</h3>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-foreground">{dual(allTimeTotals.totalSales, secondaryCurrency, exchangeRate)}</span>
              <span className="text-sm text-muted-foreground"> / {dual(salesTarget, secondaryCurrency, exchangeRate)}</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${targetProgress >= 100 ? "bg-gradient-to-r from-emerald-500 to-green-400" : targetProgress >= 75 ? "bg-gradient-to-r from-blue-500 to-cyan-400" : targetProgress >= 50 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-rose-500 to-orange-400"}`}
              style={{ width: `${targetProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{targetProgress.toFixed(1)}% achieved</span>
            {targetProgress >= 100 && (
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Target Achieved! Bonus Eligible
              </span>
            )}
          </div>
        </div>
      )}

      {/* ====== QUICK NAV BUTTONS ====== */}
      <div className="flex flex-wrap gap-2">
        <Link href="/partner/finance/revenue" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 transition-colors">
          <TrendingUp className="w-3.5 h-3.5" /> My Revenue
        </Link>
        <Link href="/partner/finance/sccg-payments" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-bold hover:bg-indigo-500/20 transition-colors">
          <ArrowUpRight className="w-3.5 h-3.5" /> SCCG Settlements
        </Link>
        <Link href="/partner/finance/target" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition-colors">
          <Target className="w-3.5 h-3.5" /> Target vs Achievement
        </Link>
        <Link href="/partner/finance/due-payments" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition-colors">
          <Clock className="w-3.5 h-3.5" /> Due Payments
        </Link>
        <Link href="/partner/finance/invoices" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold hover:bg-blue-500/20 transition-colors">
          <FileText className="w-3.5 h-3.5" /> Invoices
        </Link>
        <Link href="/partner/finance/payments" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-bold hover:bg-cyan-500/20 transition-colors">
          <CreditCard className="w-3.5 h-3.5" /> Make Payment
        </Link>
        <Link href="/partner/finance/refunds" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-bold hover:bg-purple-500/20 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Refund Requests
        </Link>
      </div>

      {/* ====== TARGET VS ACHIEVEMENT MINI WIDGET ====== */}
      {salesTarget > 0 && (() => {
        const currentYear = new Date().getFullYear();
        const yearCandidates = candidates.filter((c) => c.createdAt?.startsWith(String(currentYear)));
        const yearSales = yearCandidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
        const yearProgress = Math.min(100, (yearSales / salesTarget) * 100);
        const monthsElapsed = new Date().getMonth() + 1;
        const expectedProgress = (monthsElapsed / 12) * 100;
        const isAhead = yearProgress >= expectedProgress;
        return (
          <Link href="/partner/finance/target" className="block bg-card border rounded-2xl p-5 hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-foreground text-sm">Target vs Achievement — {currentYear}</h3>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isAhead ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {isAhead ? "On Track" : "Behind Target"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-lg font-extrabold text-foreground">{dual(yearSales, secondaryCurrency, exchangeRate)}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Achieved</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-muted-foreground">{dual(salesTarget, secondaryCurrency, exchangeRate)}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Target</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-extrabold ${yearProgress >= 100 ? "text-emerald-500" : "text-amber-500"}`}>{yearProgress.toFixed(1)}%</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Progress</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${yearProgress >= 100 ? "bg-gradient-to-r from-emerald-500 to-green-400" : yearProgress >= 75 ? "bg-gradient-to-r from-blue-500 to-cyan-400" : yearProgress >= 50 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-rose-500 to-orange-400"}`}
                style={{ width: `${yearProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              Click for detailed Target vs Achievement analysis <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </Link>
        );
      })()}

      {/* ====== VIEW TOGGLE + FILTERS ====== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border">
            <button onClick={() => setViewMode("monthly")}
              className={`px-4 py-2 text-xs font-bold transition-colors ${viewMode === "monthly" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>
              <Calendar className="w-3.5 h-3.5 inline mr-1" /> Monthly
            </button>
            <button onClick={() => setViewMode("cumulative")}
              className={`px-4 py-2 text-xs font-bold transition-colors ${viewMode === "cumulative" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>
              <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> Yearly
            </button>
          </div>
          {viewMode === "monthly" ? (
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
              {months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          ) : (
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "deposit-paid", "fully-paid", "overdue"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors border ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}>
              {s === "all" ? "All" : s === "deposit-paid" ? "Partial" : s === "fully-paid" ? "Paid" : s === "overdue" ? "Overdue" : "Pending"}
            </button>
          ))}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border bg-background text-xs w-40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* ====== PERIOD SUMMARY CARDS ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Period Sales</p>
          <p className="text-lg font-extrabold text-foreground mt-1">{dual(periodTotals.totalSales, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground">{periodCandidates.length} clients</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Period Received</p>
          <p className="text-lg font-extrabold text-emerald-500 mt-1">{dual(periodTotals.totalReceived, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground">{periodTotals.clientsPaid} fully paid</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Your Earnings</p>
          <p className="text-lg font-extrabold text-purple-500 mt-1">{dual(periodTotals.totalPartnerShare, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground">{marginPercent}% commission</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">SCCG Portion</p>
          <p className="text-lg font-extrabold text-indigo-500 mt-1">{dual(periodTotals.totalSccgShare, secondaryCurrency, exchangeRate)}</p>
          <p className="text-[10px] text-muted-foreground">{periodTotals.clientsDue} clients due</p>
        </div>
      </div>

      {/* ====== MONTHLY CHART (only in yearly view) ====== */}
      {viewMode === "cumulative" && (
        <div className="bg-card border rounded-2xl p-5">
          <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Monthly Breakdown — {selectedYear}
          </h3>
          <div className="flex items-end gap-2 h-40">
            {monthlyChartData.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                {m.sales > 0 && (
                  <p className="text-[9px] font-bold text-foreground">{dual(m.sales, secondaryCurrency, exchangeRate)}</p>
                )}
                <div className="w-full flex flex-col gap-px">
                  <div className="w-full bg-purple-500/80 rounded-t transition-all"
                    style={{ height: `${Math.max(2, (m.partnerShare / maxChartValue) * 110)}px` }}
                    title={`Your share: ${dual(m.partnerShare, secondaryCurrency, exchangeRate)}`} />
                  <div className="w-full bg-indigo-500/60 rounded-b transition-all"
                    style={{ height: `${Math.max(2, (m.sccgShare / maxChartValue) * 110)}px` }}
                    title={`SCCG share: ${dual(m.sccgShare, secondaryCurrency, exchangeRate)}`} />
                </div>
                <p className={`text-[9px] font-medium ${m.month === selectedMonth ? "text-primary font-bold" : "text-muted-foreground"}`}>{m.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500/80" /> Your Commission</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-500/60" /> SCCG Share</span>
          </div>
        </div>
      )}

      {/* ====== PER-CLIENT TRACKING TABLE ====== */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Client Sales Tracking ({filteredCandidates.length})
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            {viewMode === "monthly" ? fmtMonth(selectedMonth) : `Year ${selectedYear}`}
          </span>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No clients found for this period</p>
            <p className="text-xs opacity-60 mt-1">Try a different filter or time period.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredCandidates.map((c) => {
              const due = Math.max(0, (c.totalServiceFee || 0) - (c.depositAmount || 0));
              const isExpanded = expandedClient === c.id;
              const cTx = clientTransactions(c.id);
              const hasDue = due > 0 && c.paymentStatus !== "fully-paid" && c.paymentStatus !== "refunded";
              const isSendingReminder = reminderSending === c.id;
              const reminderAlreadySent = reminderSent.has(c.id);

              return (
                <div key={c.id}>
                  {/* Client Row */}
                  <div className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setExpandedClient(isExpanded ? null : c.id)}>
                    {/* Expand icon */}
                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                    {/* Client info */}
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-7 gap-2 items-center">
                      <div className="col-span-2 sm:col-span-2 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.fullName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.sccgId || c.id.slice(0, 8)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-foreground">{dual(c.totalServiceFee || 0, secondaryCurrency, exchangeRate)}</p>
                        <p className="text-[9px] text-muted-foreground">Total Fee</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-emerald-500">{dual(c.depositAmount || 0, secondaryCurrency, exchangeRate)}</p>
                        <p className="text-[9px] text-muted-foreground">Received</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xs font-bold ${due > 0 ? "text-rose-500" : "text-emerald-500"}`}>{dual(due, secondaryCurrency, exchangeRate)}</p>
                        <p className="text-[9px] text-muted-foreground">Due</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-purple-500">{dual(c.partnerShare || 0, secondaryCurrency, exchangeRate)}</p>
                        <p className="text-[9px] text-muted-foreground">Commission</p>
                      </div>
                      <div className="text-center flex items-center justify-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusColors[c.paymentStatus] || statusColors.pending}`}>
                          {c.paymentStatus?.replace("-", " ") || "pending"}
                        </span>
                        {/* Reminder button */}
                        {hasDue && c.email && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSendReminder(c); }}
                            disabled={isSendingReminder || reminderAlreadySent}
                            title={reminderAlreadySent ? "Reminder sent" : "Send payment reminder"}
                            className={`p-1 rounded-lg transition-colors ${reminderAlreadySent ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 hover:bg-amber-500/10"} disabled:opacity-50`}
                          >
                            {isSendingReminder ? (
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                            ) : reminderAlreadySent ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Bell className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 bg-muted/10 border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Financial Split */}
                        <div className="bg-card border rounded-xl p-4 space-y-2">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-primary" /> Financial Split
                          </h4>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">Total Fee:</span><span className="font-bold">{dual(c.totalServiceFee || 0, secondaryCurrency, exchangeRate)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Your Commission ({c.marginPercentage || marginPercent}%):</span><span className="font-bold text-purple-500">{dual(c.partnerShare || 0, secondaryCurrency, exchangeRate)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">SCCG Share ({100 - (c.marginPercentage || marginPercent)}%):</span><span className="font-bold text-indigo-500">{dual(c.sccgShare || 0, secondaryCurrency, exchangeRate)}</span></div>
                            <hr className="border-border" />
                            <div className="flex justify-between"><span className="text-muted-foreground">Received from Client:</span><span className="font-bold text-emerald-500">{dual(c.depositAmount || 0, secondaryCurrency, exchangeRate)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding:</span><span className="font-bold text-rose-500">{dual(due, secondaryCurrency, exchangeRate)}</span></div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Link href={`/partner/candidates/${c.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                              <Eye className="w-3 h-3" /> View Details
                            </Link>
                            {hasDue && c.email && !reminderAlreadySent && (
                              <button onClick={() => handleSendReminder(c)} disabled={isSendingReminder}
                                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                                <Mail className="w-3 h-3" /> Send Reminder
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Payment History */}
                        <div className="bg-card border rounded-xl p-4 space-y-2">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" /> Payment History
                          </h4>
                          {cTx.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No transactions recorded for this client.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {cTx.map((t) => (
                                <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 group">
                                  <div>
                                    <p className="font-medium text-foreground capitalize">{t.type.replace("-", " ")}</p>
                                    <p className="text-[10px] text-muted-foreground">{t.date || "—"} · {t.reference || "—"}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`font-bold ${t.type === "payment" ? "text-emerald-500" : t.type === "refund" ? "text-rose-500" : "text-foreground"}`}>
                                      {dual(t.amount, secondaryCurrency, exchangeRate)}
                                    </span>
                                    {t.type === "payment" && c.email && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSendConfirmation(c, t); }}
                                        disabled={confirmSending === t.id || confirmSent.has(t.id)}
                                        title={confirmSent.has(t.id) ? "Confirmation sent" : "Send payment confirmation"}
                                        className={`p-1 rounded-md transition-colors ${
                                          confirmSent.has(t.id) ? "text-emerald-500 bg-emerald-500/10" : "text-primary opacity-0 group-hover:opacity-100 hover:bg-primary/10"
                                        } disabled:opacity-50`}
                                      >
                                        {confirmSending === t.id ? (
                                          <Clock className="w-3 h-3 animate-spin" />
                                        ) : confirmSent.has(t.id) ? (
                                          <CheckCircle2 className="w-3 h-3" />
                                        ) : (
                                          <Mail className="w-3 h-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
