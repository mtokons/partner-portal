import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import {
  getOrders, getClients, getFinancials, getActivities,
  getInstallments, getInvoices,
  getSalesOffers, getSalesOrders,
} from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, Users, DollarSign, AlertTriangle, FileText,
  TrendingUp, ArrowUpRight, ArrowDownRight, Zap, Clock,
  CheckCircle2, Package, Activity, BarChart2,
} from "lucide-react";
import CashflowAreaChart from "@/components/charts/CashflowAreaChart";
import OrderStatusPieChart from "@/components/charts/OrderStatusPieChart";
import RevenueBarChart from "@/components/charts/RevenueBarChart";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const pid = user.role === "admin" ? undefined : user.partnerId;

  if (user.role === "partner" && !pid) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] text-center px-4">
        <div className="h-20 w-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">⏳</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Account Under Review</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your partner application is currently being reviewed by the SCCG administrators.
          You will receive access to your dashboard once approved.
        </p>
      </div>
    );
  }
  const [orders, clients, financials, activities, installments, invoices, sOrders, sOffers] = await Promise.all([
    getOrders(pid), getClients(pid), getFinancials(pid),
    getActivities(pid), getInstallments(pid), getInvoices(pid),
    getSalesOrders(pid), getSalesOffers(pid),
  ]);

  // --- Metric Calculations ---
  
  // 1. Revenue: From aggregated financials OR completed sales orders
  const financialRevenue = financials.reduce((s, f) => s + (f.revenue || 0), 0);
  const orderRevenue = sOrders.filter(o => o.status === "completed" || o.status === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalRevenue = financialRevenue > 0 ? financialRevenue : orderRevenue;

  // Currency Conversion (BDT -> EUR)
  let totalRevenueEur: number | null = null;
  let rate: number | null = null;
  try {
    const { getBdtToEurRate } = await import("@/lib/currency");
    rate = await getBdtToEurRate();
    totalRevenueEur = Math.round((totalRevenue * (rate || 0.008) + Number.EPSILON) * 100) / 100;
  } catch {
    totalRevenueEur = Math.round(totalRevenue * 0.008);
  }

  // 2. Sales Pipeline: Accepted but not yet converted to orders + Sent offers
  const acceptedOffers = sOffers.filter(o => o.status === "accepted" && !o.salesOrderId);
  const sentOffers = sOffers.filter(o => o.status === "sent");
  const pipelineValue = [...acceptedOffers, ...sentOffers].reduce((s, o) => s + (o.totalAmount || 0), 0);

  // 3. Outstanding: Unpaid invoices + Overdue installments
  const unpaidInvoiceAmt = invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + (i.totalAmount || 0), 0);
  const overdueInstallmentAmt = installments.filter(i => i.status === "overdue").reduce((s, i) => s + (i.amount || 0), 0);
  const totalOutstanding = (financials.reduce((s, f) => s + (f.outstanding || 0), 0)) || (unpaidInvoiceAmt + overdueInstallmentAmt);

  const pendingOrdersCount = sOrders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const overdueInstallments = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoices = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  const kpis = [
    {
      label: "Total Revenue",
      value: `BDT ${(totalRevenue / 1000).toFixed(1)}K`,
      sub: totalRevenueEur ? `≈ €${totalRevenueEur.toLocaleString()}` : undefined,
      icon: DollarSign,
      gradient: "gradient-blue",
      bg: "linear-gradient(135deg, #4f8ef7 0%, #1a4fd8 60%, #0f2fa8 100%)",
      trend: "+14.2%",
      trendUp: true,
      detail: "Gross volume",
      href: "/financials",
    },
    {
      label: "Sales Pipeline",
      value: `BDT ${(pipelineValue / 1000).toFixed(1)}K`,
      sub: `${acceptedOffers.length} accepted / ${sentOffers.length} sent`,
      icon: Zap,
      gradient: "gradient-cosmic",
      bg: "linear-gradient(135deg, #818cf8 0%, #6366f1 40%, #4f46e5 100%)",
      trend: `${sOffers.length} total`,
      trendUp: sOffers.length > 0,
      detail: "Future potential",
      href: "/sales/offers",
    },
    {
      label: "Active Orders",
      value: sOrders.length.toString(),
      sub: `${sOrders.filter(o => o.status === "completed").length} fulfilled`,
      icon: ShoppingCart,
      gradient: "gradient-purple",
      bg: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 60%, #5b21b6 100%)",
      trend: `${pendingOrdersCount} pending`,
      trendUp: pendingOrdersCount > 0,
      detail: "Fulfillment ops",
      href: "/sales/orders",
    },
    {
      label: "Outstanding",
      value: `BDT ${(totalOutstanding / 1000).toFixed(1)}K`,
      sub: `${unpaidInvoices} unpaid documents`,
      icon: TrendingUp,
      gradient: "gradient-orange",
      bg: "linear-gradient(135deg, #fbbf24 0%, #d97706 60%, #b45309 100%)",
      trend: overdueInstallments > 0 ? `${overdueInstallments} overdue` : "Healthy",
      trendUp: overdueInstallments === 0,
      detail: "Accounts receivable",
      href: "/financials/invoices",
    },
  ];

  // Chart data
  const salesData = financials.length > 0 
    ? financials.sort((a, b) => a.period.localeCompare(b.period)).map((f) => ({ period: f.period, revenue: f.revenue, paid: f.paid }))
    : [{ period: "No Data", revenue: 0, paid: 0 }];

  const statusCounts: Record<string, number> = {};
  sOrders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const orderStatusData = Object.keys(statusCounts).length > 0 
    ? Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
    : [{ name: "No Orders", value: 0 }];

  const plData = financials.length > 0
    ? financials.sort((a, b) => a.period.localeCompare(b.period)).map((f) => ({ period: f.period, income: f.revenue, expenses: 0, profit: f.revenue }))
    : [{ period: "No Data", income: 0, expenses: 0, profit: 0 }];

  const activityTypeColors: Record<string, string> = {
    order: "bg-blue-500",
    payment: "bg-emerald-500",
    client: "bg-violet-500",
    invoice: "bg-orange-500",
    default: "bg-slate-500",
  };

  return (
    <div className="space-y-7 page-enter">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-blue" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Overview
            </p>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight leading-tight">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              {user.name?.split(" ")[0] || "User"}
            </span>
            {"  👋"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}Here&apos;s your business snapshot.
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Data
          </div>
        </div>
      </div>

      {/* ── Alert Banners ── */}
      {(overdueInstallments > 0 || unpaidInvoices > 0) && (
        <div className="flex flex-wrap gap-3">
          {overdueInstallments > 0 && (
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/70 rounded-2xl px-4 py-3 text-sm shadow-sm">
              <div className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-red-800 font-semibold text-sm leading-none">{overdueInstallments} overdue installment{overdueInstallments > 1 ? "s" : ""}</p>
                <p className="text-red-600/70 text-xs mt-0.5">Requires immediate attention</p>
              </div>
            </div>
          )}
          {unpaidInvoices > 0 && (
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/70 rounded-2xl px-4 py-3 text-sm shadow-sm">
              <div className="h-8 w-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-orange-800 font-semibold text-sm leading-none">{unpaidInvoices} unpaid invoice{unpaidInvoices > 1 ? "s" : ""}</p>
                <p className="text-orange-600/70 text-xs mt-0.5">Follow up recommended</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
        {kpis.map((kpi) => {

          return (
            <Link 
              href={kpi.href} 
              key={kpi.label} 
              className={`kpi-card card-enter block focus-visible:ring-2 focus-visible:ring-white/60 outline-none`}
              style={{ background: kpi.bg }}
            >
              {/* Decorative circles */}
              <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -top-8 -left-4 h-20 w-20 rounded-full bg-white/5 pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <kpi.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${kpi.trendUp ? "bg-white/20 text-white" : "bg-black/15 text-white/80"}`}>
                    {kpi.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {kpi.trend}
                  </span>
                </div>
                <p className="text-3xl font-black text-white leading-none tracking-tight">{kpi.value}</p>
                <p className="text-sm font-medium text-white/90 mt-1.5">{kpi.label}</p>
                {kpi.sub && <p className="text-xs text-white/60 mt-1">{kpi.sub}</p>}

                {/* Progress bar */}
                <div className="mt-4 progress-bar bg-black/10">
                  <div
                    className="progress-bar-fill bg-white/50"
                    style={{ width: kpi.trendUp ? "72%" : "38%" }}
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-1">{kpi.detail}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Products", value: sOrders.length > 0 ? "24" : "0", icon: Package, color: "text-blue-500", bg: "bg-blue-50 border-blue-100", href: "/admin/products" },
          { label: "Clients", value: clients.length, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50 border-indigo-100", href: "/clients" },
          { label: "Paid Invoices", value: invoices.filter(i => i.status === "paid").length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100", href: "/financials?tab=invoices" },
          { label: "Activities", value: activities.length, icon: Activity, color: "text-violet-500", bg: "bg-violet-50 border-violet-100", href: "/activity" },
        ].map((stat) => (
          <Link href={stat.href} key={stat.label} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${stat.bg} card-hover`}>
            <div className={`h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
              <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-foreground leading-none">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow – large */}
        <Card className="lg:col-span-2 card-hover border-0 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Cashflow Overview
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue vs payments collected</p>
            </div>
            <Badge variant="outline" className="text-xs rounded-full px-3 py-1 bg-primary/5 border-primary/20 text-primary font-medium">
              Last 6 months
            </Badge>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <CashflowAreaChart data={salesData} />
          </CardContent>
        </Card>

        {/* Order status donut */}
        <Card className="card-hover border-0 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" />
              Order Status
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{sOrders.length} active orders</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <OrderStatusPieChart data={orderStatusData} />
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <Card className="card-hover border-0 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Revenue by Period
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly breakdown</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <RevenueBarChart data={plData} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="card-hover border-0 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                Recent Activity
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{activities.length} events recorded</p>
            </div>
            <Badge variant="outline" className="text-xs rounded-full px-3 py-1">
              Today
            </Badge>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-1 max-h-[300px] overflow-y-auto -mr-2 pr-2">
              {activities.slice(0, 10).map((a, idx) => (
                <div key={a.id} className="group flex items-start gap-3 py-2.5 rounded-xl hover:bg-muted/40 px-2 -mx-2 transition-all duration-150">
                  <div className="relative shrink-0">
                    <div className={`h-8 w-8 rounded-full ${activityTypeColors[a.type] || activityTypeColors.default} bg-opacity-15 flex items-center justify-center`}>
                      <span className={`text-xs font-bold capitalize ${activityTypeColors[a.type] ? "text-current" : ""} text-white`}>
                        {a.type[0].toUpperCase()}
                      </span>
                    </div>
                    {idx < activities.slice(0, 10).length - 1 && (
                      <div className="absolute left-1/2 top-8 -translate-x-1/2 w-px h-3 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-foreground truncate font-medium">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="capitalize text-[10px] shrink-0 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {a.type}
                  </Badge>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="py-12 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
