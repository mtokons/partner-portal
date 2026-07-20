"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, ShoppingCart, DollarSign, AlertTriangle, Building2, TrendingUp,
  FlaskConical, Database, Layers,
} from "lucide-react";
import RevenueBarChart from "@/components/charts/RevenueBarChart";
import CashflowAreaChart from "@/components/charts/CashflowAreaChart";
import OrderStatusPieChart from "@/components/charts/OrderStatusPieChart";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

export type OverviewView = {
  kpis: {
    activePartners: number;
    pendingPartners: number;
    totalOrders: number;
    totalClients: number;
    totalRevenue: number;
    netProfit: number;
    overdueInstallments: number;
  };
  pl: { period: string; income: number; expenses: number; profit: number }[];
  cashflow: { period: string; revenue: number; paid: number }[];
  orderStatus: { name: string; value: number }[];
  tiers: { name: string; value: number }[];
  topPartners: { name: string; company: string; revenue: number }[];
};

const TIER_COLORS: Record<string, string> = {
  Silver: "#94a3b8",
  Gold: "#f59e0b",
  Diamond: "#06b6d4",
  Platinum: "#a855f7",
};

type Filter = "all" | "real" | "test";

export default function AdminOverviewClient({
  all,
  real,
  test,
  rate,
  testPartnerCount,
}: {
  all: OverviewView;
  real: OverviewView;
  test: OverviewView;
  rate: number | null;
  testPartnerCount: number;
}) {
  const fmtEur = (bdt: number) => (rate ? `€${(bdt * rate).toFixed(0)}` : `৳${bdt.toFixed(0)}`);
  const [filter, setFilter] = useState<Filter>(testPartnerCount > 0 ? "real" : "all");
  const view = filter === "all" ? all : filter === "real" ? real : test;

  const kpiCards = [
    { label: "Active Partners", value: view.kpis.activePartners, icon: Building2, grad: "from-blue-500 to-indigo-500" },
    { label: "Pending Approval", value: view.kpis.pendingPartners, icon: Users, grad: "from-amber-500 to-orange-500" },
    { label: "Total Orders", value: view.kpis.totalOrders, icon: ShoppingCart, grad: "from-violet-500 to-purple-500" },
    { label: "Total Clients", value: view.kpis.totalClients, icon: Users, grad: "from-emerald-500 to-green-500" },
    { label: "Total Revenue", value: fmtEur(view.kpis.totalRevenue), icon: DollarSign, grad: "from-sky-500 to-blue-500" },
    { label: "Net Profit", value: fmtEur(view.kpis.netProfit), icon: TrendingUp, grad: view.kpis.netProfit >= 0 ? "from-teal-500 to-emerald-500" : "from-rose-500 to-red-500" },
  ];

  const filters: { id: Filter; label: string; icon: any; count?: string }[] = [
    { id: "all", label: "All Data", icon: Layers },
    { id: "real", label: "Real Data", icon: Database },
    { id: "test", label: "Test Data", icon: FlaskConical },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Admin Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Company-wide performance across all SCCG partners.
          </p>
        </div>
        {/* Real / Test / All segmented control */}
        <div className="inline-flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
          {filters.map((f) => {
            const active = filter === f.id;
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? f.id === "test"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
                {f.id === "test" && testPartnerCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    {testPartnerCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {filter === "test" && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
          <FlaskConical className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Showing <strong>dummy/test data</strong> from {testPartnerCount} flagged account{testPartnerCount === 1 ? "" : "s"}. These are excluded from the Real Data view.
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${c.grad} shadow-lg`}>
              <div className="absolute -right-3 -bottom-3 opacity-20">
                <Icon className="w-16 h-16" />
              </div>
              <div className="relative">
                <Icon className="w-5 h-5 mb-2 opacity-90" />
                <div className="text-[11px] font-medium uppercase tracking-wide opacity-90">{c.label}</div>
                <div className="text-xl font-bold mt-1">{c.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {view.kpis.overdueInstallments > 0 && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300 font-medium">
            {view.kpis.overdueInstallments} overdue installment{view.kpis.overdueInstallments > 1 ? "s" : ""} in this view
          </span>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Profit &amp; Loss by Period</CardTitle></CardHeader>
          <CardContent>
            {view.pl.length ? <RevenueBarChart data={view.pl} /> : <EmptyChart />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs Collected</CardTitle></CardHeader>
          <CardContent>
            {view.cashflow.length ? <CashflowAreaChart data={view.cashflow} /> : <EmptyChart />}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            {view.orderStatus.length ? <OrderStatusPieChart data={view.orderStatus} /> : <EmptyChart />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Partners by Tier</CardTitle></CardHeader>
          <CardContent>
            {view.tiers.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={view.tiers} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {view.tiers.map((t) => (
                      <Cell key={t.name} fill={TIER_COLORS[t.name] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Partners by Revenue</CardTitle></CardHeader>
          <CardContent>
            {view.topPartners.length ? (
              <div className="space-y-3">
                {view.topPartners.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.company}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-blue-700 border-blue-200 shrink-0">{fmtEur(p.revenue)}</Badge>
                  </div>
                ))}
              </div>
            ) : <EmptyChart />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
      No data for this view yet
    </div>
  );
}
