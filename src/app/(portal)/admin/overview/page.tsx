import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getPartners, getOrders, getClients, getFinancials, getExpenses, getInstallments } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ShoppingCart, DollarSign, AlertTriangle, Building2, TrendingUp } from "lucide-react";
import RevenueBarChart from "@/components/charts/RevenueBarChart";
import { formatBdtEur, formatEurWithRate } from "@/lib/formatCurrency";

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const [partners, orders, clients, financials, expenses, installments] = await Promise.all([
    getPartners(), getOrders(), getClients(), getFinancials(), getExpenses(), getInstallments(),
  ]);

  const activePartners = partners.filter((p) => p.status === "active" && p.role === "partner").length;
  const pendingPartners = partners.filter((p) => p.status === "pending").length;
  const totalRevenue = financials.reduce((s, f) => s + f.revenue, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const overdueInstallments = installments.filter((i) => i.status === "overdue").length;

  let rate: number | null = null;
  try {
    const { getBdtToEurRate } = await import("@/lib/currency");
    rate = await getBdtToEurRate();
  } catch (err) {
    rate = null;
  }

  // Global P&L by period
  const periodMap = new Map<string, { income: number; expenses: number }>();
  financials.forEach((f) => {
    const e = periodMap.get(f.period) || { income: 0, expenses: 0 };
    e.income += f.revenue;
    periodMap.set(f.period, e);
  });
  expenses.forEach((exp) => {
    const period = exp.date.slice(0, 7);
    const e = periodMap.get(period) || { income: 0, expenses: 0 };
    e.expenses += exp.amount;
    periodMap.set(period, e);
  });
  const plData = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({ period, income: data.income, expenses: data.expenses, profit: data.income - data.expenses }));

  // Top partners by revenue
  const partnerRevMap = new Map<string, { name: string; company: string; revenue: number }>();
  partners.filter((p) => p.role === "partner").forEach((p) => {
    partnerRevMap.set(p.id, { name: p.name, company: p.company, revenue: 0 });
  });
  financials.forEach((f) => {
    const pr = partnerRevMap.get(f.partnerId);
    if (pr) pr.revenue += f.revenue;
  });
  const topPartners = Array.from(partnerRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Partners</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activePartners}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Approval</CardTitle>
            <Users className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingPartners}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">BDT {totalRevenue.toFixed(0)}{rate ? ` · €${(totalRevenue * rate).toFixed(0)}` : ""}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              BDT {totalProfit.toFixed(0)}{rate ? ` · €${(totalProfit * rate).toFixed(0)}` : ""}
            </div>
          </CardContent>
        </Card>
      </div>

      {overdueInstallments > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-sm text-red-700 font-medium">
            {overdueInstallments} overdue installment{overdueInstallments > 1 ? "s" : ""} across all partners
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Global P&L by Period</CardTitle></CardHeader>
          <CardContent><RevenueBarChart data={plData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Partners by Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPartners.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.company}</div>
                  </div>
                  <Badge variant="outline" className="text-blue-700 border-blue-200">
                    {formatBdtEur(p.revenue, rate ? (p.revenue * rate) : undefined, 0)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
