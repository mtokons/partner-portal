import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOrders } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:       { label: "Pending",      variant: "secondary" },
  "in-progress": { label: "In Progress",  variant: "outline" },
  completed:     { label: "Completed",    variant: "default" },
  cancelled:     { label: "Cancelled",    variant: "destructive" },
};

export default async function SalesOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const orders = await getSalesOrders(user.role === "admin" ? undefined : user.partnerId);

  const pending = orders.filter((o) => o.status === "pending").length;
  const inProgress = orders.filter((o) => o.status === "in-progress").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full gradient-cosmic" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sales</p>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Sales Orders</h1>
        <p className="text-sm text-muted-foreground mt-1.5">{orders.length} orders from accepted offers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "In Progress", value: inProgress, icon: Loader2, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
          { label: "Completed", value: completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
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

      {/* Table */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            All Sales Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-6">Order #</TableHead>
                <TableHead>From Offer</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total (BDT)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No sales orders yet. Accept an offer to create one.
                  </TableCell>
                </TableRow>
              )}
              {orders.map((order) => {
                const cfg = statusConfig[order.status] || statusConfig.pending;
                return (
                  <TableRow key={order.id} className="group hover:bg-muted/20">
                    <TableCell className="pl-6 font-mono font-semibold text-primary">
                      <Link href={`/sales/orders/${order.id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{order.offerNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{order.clientName}</p>
                    </TableCell>
                    <TableCell className="font-semibold">BDT {order.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Link href={`/sales/orders/${order.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
