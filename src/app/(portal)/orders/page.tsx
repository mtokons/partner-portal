import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getOrders } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Package, Filter, Clock, TrendingUp, CheckCircle2, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; css: string }> = {
  pending:   { label: "Pending",   css: "status-pending" },
  confirmed: { label: "Confirmed", css: "status-confirmed" },
  shipped:   { label: "Shipped",   css: "status-shipped" },
  delivered: { label: "Delivered", css: "status-delivered" },
  cancelled: { label: "Cancelled", css: "status-cancelled" },
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const [orders, rate] = await Promise.all([
    getOrders(user.role === "admin" ? undefined : user.partnerId),
    loadRate(),
  ]);

  const delivered = orders.filter(o => o.status === "delivered").length;
  const pending   = orders.filter(o => o.status === "pending").length;
  const cancelled = orders.filter(o => o.status === "cancelled").length;
  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="space-y-7 page-enter">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-purple" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Orders
            </p>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Order History</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{orders.length} orders across all periods</p>
        </div>
      </div>

      {/* ── Order Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: ShoppingCart, color: "text-primary", bg: "bg-primary/8 border-primary/15" },
          { label: "Delivered", value: delivered, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Pending", value: pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "Cancelled", value: cancelled, icon: XCircle, color: "text-red-500", bg: "bg-red-50 border-red-100" },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-center gap-3 px-4 py-4 rounded-2xl border ${stat.bg} card-hover`}>
            <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground leading-none">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total value banner */}
      <div className="relative overflow-hidden rounded-2xl kpi-card gradient-purple p-0">
        <div className="relative z-10 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Total Portfolio Value</p>
              <p className="text-white font-black text-2xl leading-tight">
                {fmtBdt(totalValue, rate, { compact: true })}
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-white/50 text-xs">Conversion rate</p>
            <p className="text-white/80 text-sm font-semibold">{rate ? `1 EUR = ${(1 / rate).toFixed(2)} BDT` : "—"}</p>
          </div>
        </div>
      </div>

      {/* ── Orders Table ── */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              All Orders
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Complete order history</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 bg-muted/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-6">Order ID</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="table-row-hover border-border/40 group">
                    <TableCell className="pl-6">
                      <span className="font-mono text-xs bg-muted/60 px-2 py-1 rounded-lg text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                          {(order.clientName || order.clientId || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm text-foreground">{order.clientName || order.clientId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[220px]">
                        <p className="text-sm text-foreground truncate">
                          {order.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length > 1 ? "s" : ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-foreground">{fmtBdt(order.totalAmount, rate, { compact: true })}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusConfig[order.status]?.css || "bg-gray-100 text-gray-700"}`}>
                        {statusConfig[order.status]?.label || order.status}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6">
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No orders yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Orders will appear here once created</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
