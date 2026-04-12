import { fetchFinanceSummary } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3 } from "lucide-react";

export default async function ReportsPage() {
  const data = await fetchFinanceSummary();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Reports</h1>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Total Received
            </div>
            <p className="text-2xl font-bold">৳{(data.totalReceived / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">{data.totalPaymentCount} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> This Month
            </div>
            <p className="text-2xl font-bold text-green-600">৳{(data.monthReceived / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <FileText className="h-3.5 w-3.5" /> Total Billed
            </div>
            <p className="text-2xl font-bold">৳{(data.totalBilled / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">{data.totalInvoiceCount} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CreditCard className="h-3.5 w-3.5" /> Card Balance
            </div>
            <p className="text-2xl font-bold">৳{(data.totalCardBalance / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">{data.activeCardCount} active cards</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{data.paidInvoiceCount}</p>
            <p className="text-[10px] text-muted-foreground">Paid Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-red-500 mb-1" />
            <p className="text-lg font-bold text-red-600">{data.overdueInvoiceCount}</p>
            <p className="text-[10px] text-muted-foreground">Overdue Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{data.totalInstallments}</p>
            <p className="text-[10px] text-muted-foreground">Installments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{data.paidInstallmentCount}</p>
            <p className="text-[10px] text-muted-foreground">Paid Inst.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-red-500 mb-1" />
            <p className="text-lg font-bold text-red-600">{data.overdueInstallmentCount}</p>
            <p className="text-[10px] text-muted-foreground">Overdue Inst.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <CreditCard className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{data.totalCardCount}</p>
            <p className="text-[10px] text-muted-foreground">SCCG Cards</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Monthly Revenue (6M)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.monthlyTrend.map((m) => {
                const maxAmount = Math.max(...data.monthlyTrend.map((t) => t.amount), 1);
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">{m.month}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(m.amount / maxAmount) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-20 text-right">৳{(m.amount / 1000).toFixed(0)}K</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">{m.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(data.methodBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payment data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.methodBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount]) => {
                    const total = Object.values(data.methodBreakdown).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                    return (
                      <div key={method} className="flex items-center gap-3">
                        <span className="text-xs capitalize w-24 truncate">{method.replace(/-/g, " ")}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium w-16 text-right">৳{(amount / 1000).toFixed(0)}K</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardHeader><CardTitle>Collection Performance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold">
                {data.totalBilled > 0 ? Math.round((data.totalReceived / data.totalBilled) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Overall Collection Rate</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Billed</span><span className="font-medium">৳{data.totalBilled.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Collected</span><span className="font-medium text-green-600">৳{data.totalReceived.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-medium text-red-600">৳{Math.max(0, data.totalBilled - data.totalReceived).toLocaleString()}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Installment Health */}
        <Card>
          <CardHeader><CardTitle>Installment Health</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data.totalInstallments === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No installments yet</p>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {Math.round((data.paidInstallmentCount / data.totalInstallments) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Paid on Time</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{data.totalInstallments}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium text-green-600">{data.paidInstallmentCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Overdue</span><span className="font-medium text-red-600">{data.overdueInstallmentCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-medium">{data.totalInstallments - data.paidInstallmentCount - data.overdueInstallmentCount}</span></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
