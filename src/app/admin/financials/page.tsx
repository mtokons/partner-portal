import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getFinancials, getExpenses, getInstallments, getInvoices, getPartners } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RevenueBarChart from "@/components/charts/RevenueBarChart";

export default async function AdminFinancialsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const [financials, expenses, installments, invoices, partners] = await Promise.all([
    getFinancials(), getExpenses(), getInstallments(), getInvoices(), getPartners(),
  ]);

  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  const totalRevenue = financials.reduce((s, f) => s + f.revenue, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalOutstanding = financials.reduce((s, f) => s + f.outstanding, 0);
  const overdueInstallments = installments.filter((i) => i.status === "overdue");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");

  // P&L by period
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

  // Per-partner summary
  const partnerMetrics = partners.filter((p) => p.role === "partner").map((p) => {
    const pFinancials = financials.filter((f) => f.partnerId === p.id);
    const pExpenses = expenses.filter((e) => e.partnerId === p.id);
    const revenue = pFinancials.reduce((s, f) => s + f.revenue, 0);
    const expTotal = pExpenses.reduce((s, e) => s + e.amount, 0);
    return { ...p, revenue, expenses: expTotal, profit: revenue - expTotal };
  }).sort((a, b) => b.revenue - a.revenue);

  // attempt to get conversion rate
  let rate: number | null = null;
  try {
    const { getBdtToEurRate } = await import("@/lib/currency");
    rate = await getBdtToEurRate();
  } catch (err) {
    rate = null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Global Financials</h1>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">BDT {totalRevenue.toFixed(0)}{rate ? ` · €${(totalRevenue * rate).toFixed(0)}` : ""}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Expenses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">BDT {totalExpenses.toFixed(0)}{rate ? ` · €${(totalExpenses * rate).toFixed(0)}` : ""}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Net Profit</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              BDT {totalProfit.toFixed(0)}{rate ? ` · €${(totalProfit * rate).toFixed(0)}` : ""}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Outstanding</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">BDT {totalOutstanding.toFixed(0)}{rate ? ` · €${(totalOutstanding * rate).toFixed(0)}` : ""}</div></CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(overdueInstallments.length > 0 || overdueInvoices.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueInstallments.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">Overdue Installments ({overdueInstallments.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {overdueInstallments.slice(0, 4).map((i) => (
                    <div key={i.id} className="flex justify-between text-xs text-red-700">
                      <span>{i.clientName}</span>
                      <span>BDT {i.amount.toFixed(2)}{rate ? ` · €${(i.amount * rate).toFixed(2)}` : ""} — due {i.dueDate}</span>
                    </div>
                  ))}
                  {overdueInstallments.length > 4 && <p className="text-xs text-red-500">+{overdueInstallments.length - 4} more</p>}
                </div>
              </CardContent>
            </Card>
          )}
          {overdueInvoices.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700">Overdue Invoices ({overdueInvoices.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {overdueInvoices.slice(0, 4).map((i) => (
                    <div key={i.id} className="flex justify-between text-xs text-orange-700">
                      <span>{i.clientName}</span>
                      <span>BDT {i.amount.toFixed(2)}{rate ? ` · €${(i.amount * rate).toFixed(2)}` : ""} — due {i.dueDate}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* P&L Chart */}
      <Card>
        <CardHeader><CardTitle>Global P&L by Period</CardTitle></CardHeader>
        <CardContent><RevenueBarChart data={plData} /></CardContent>
      </Card>

      {/* Per-Partner table */}
      <Card>
        <CardHeader><CardTitle>Financial Summary by Partner</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerMetrics.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.company}</TableCell>
                  <TableCell className="text-blue-600 font-semibold">BDT {p.revenue.toFixed(0)}{rate ? ` · €${(p.revenue * rate).toFixed(0)}` : ""}</TableCell>
                  <TableCell className="text-red-600">BDT {p.expenses.toFixed(0)}{rate ? ` · €${(p.expenses * rate).toFixed(0)}` : ""}</TableCell>
                  <TableCell className={p.profit >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    BDT {p.profit.toFixed(0)}{rate ? ` · €${(p.profit * rate).toFixed(0)}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge className={p.status === "active" ? "bg-green-100 text-green-800" : p.status === "suspended" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
