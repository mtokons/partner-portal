import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getFinancials, getExpenses } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RevenueBarChart from "@/components/charts/RevenueBarChart";
import SalesLineChart from "@/components/charts/SalesLineChart";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, PiggyBank,
  BadgeCheck, AlertCircle, BarChart2, LineChart,
} from "lucide-react";

export default async function FinancialsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const pid = user.role === "admin" ? undefined : user.partnerId;

  const [[financials, expenses], rate] = await Promise.all([
    Promise.all([getFinancials(pid), getExpenses(pid)]),
    loadRate(),
  ]);

  const totalRevenue = financials.reduce((s, f) => s + f.revenue, 0);
  const totalPaid = financials.reduce((s, f) => s + f.paid, 0);
  const totalOutstanding = financials.reduce((s, f) => s + f.outstanding, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;
  const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

  const periodMap = new Map<string, { income: number; expenses: number }>();
  financials.forEach((f) => {
    const existing = periodMap.get(f.period) || { income: 0, expenses: 0 };
    existing.income += f.revenue;
    periodMap.set(f.period, existing);
  });
  expenses.forEach((e) => {
    const period = e.date.slice(0, 7);
    const existing = periodMap.get(period) || { income: 0, expenses: 0 };
    existing.expenses += e.amount;
    periodMap.set(period, existing);
  });
  const plData = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }));

  const salesData = financials
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((f) => ({ period: f.period, revenue: f.revenue, paid: f.paid }));

  const metrics = [
    {
      label: "Total Revenue",
      value: fmtBdt(totalRevenue, rate),
      icon: DollarSign,
      gradient: "gradient-blue",
      sub: "Gross income",
      positive: true,
    },
    {
      label: "Total Expenses",
      value: fmtBdt(totalExpenses, rate),
      icon: Receipt,
      gradient: "gradient-red",
      sub: "Operating costs",
      positive: false,
    },
    {
      label: "Net Profit",
      value: fmtBdt(profit, rate),
      icon: profit >= 0 ? TrendingUp : TrendingDown,
      gradient: profit >= 0 ? "gradient-green" : "gradient-red",
      sub: `${marginPct}% margin`,
      positive: profit >= 0,
    },
    {
      label: "Total Paid",
      value: fmtBdt(totalPaid, rate),
      icon: BadgeCheck,
      gradient: "gradient-teal",
      sub: `${collectionRate}% collected`,
      positive: true,
    },
    {
      label: "Outstanding",
      value: fmtBdt(totalOutstanding, rate),
      icon: AlertCircle,
      gradient: "gradient-orange",
      sub: "Pending receivables",
      positive: false,
    },
  ];

  return (
    <div className="space-y-7 page-enter">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full gradient-green" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Finance
          </p>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">P&L Overview</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Financial performance across all periods · {financials.length} records
        </p>
      </div>

      {/* ── Profit health banner ── */}
      <div className={`relative overflow-hidden rounded-2xl p-5 ${profit >= 0 ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}>
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${profit >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
            {profit >= 0
              ? <PiggyBank className="h-6 w-6 text-emerald-600" />
              : <TrendingDown className="h-6 w-6 text-red-500" />
            }
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${profit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
              {profit >= 0 ? "Profitable — Great job!" : "Operating at a loss"}
            </p>
            <p className={`text-xs mt-0.5 ${profit >= 0 ? "text-emerald-600/80" : "text-red-600/80"}`}>
              {profit >= 0
                ? `Net margin of ${marginPct}% — ${collectionRate}% of revenue collected`
                : `Expenses exceed revenue by ${fmtBdt(Math.abs(profit), rate, { compact: true })}`
              }
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <p className={`text-2xl font-black ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {marginPct}%
            </p>
            <p className={`text-xs ${profit >= 0 ? "text-emerald-600/70" : "text-red-500/70"}`}>net margin</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger">
        {metrics.map((m) => (
          <div key={m.label} className={`kpi-card ${m.gradient} card-enter`}>
            <div className="relative z-10">
              <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center mb-3 border border-white/20">
                <m.icon className="h-4.5 w-4.5 text-white" />
              </div>
              <p className="text-xl font-black text-white leading-tight">{m.value}</p>
              <p className="text-xs font-medium text-white/70 mt-1.5">{m.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden card-hover">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Income vs Expenses vs Profit
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Period-by-period P&L breakdown</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <RevenueBarChart data={plData} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden card-hover">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <LineChart className="h-4 w-4 text-emerald-500" />
              Revenue & Payments Over Time
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Collection tracking by period</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <SalesLineChart data={salesData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
