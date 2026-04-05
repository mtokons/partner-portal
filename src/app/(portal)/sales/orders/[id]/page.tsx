import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOrderById, getSalesOrderItems, getServiceTasks } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import OrderActions from "./OrderActions";
import ServiceTasksSection from "./ServiceTasksSection";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:       { label: "Pending",      variant: "secondary" },
  "in-progress": { label: "In Progress",  variant: "outline" },
  completed:     { label: "Completed",    variant: "default" },
  cancelled:     { label: "Cancelled",    variant: "destructive" },
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const { id } = await params;

  const [order, items, tasks] = await Promise.all([
    getSalesOrderById(id),
    getSalesOrderItems(id),
    getServiceTasks(id),
  ]);

  if (!order) notFound();
  if (user.role !== "admin" && order.createdBy !== user.id) redirect("/sales/orders");

  const cfg = statusConfig[order.status] || statusConfig.pending;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales/orders">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-foreground">{order.orderNumber}</h1>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              From offer <Link href={`/sales/offers/${order.salesOfferId}`} className="text-primary hover:underline">{order.offerNumber}</Link>
              {" · "}Created {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <OrderActions order={order} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Client</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{order.clientName}</p>
              <p className="text-sm text-muted-foreground">{order.clientEmail}</p>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right pr-6">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">BDT {item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6 font-semibold">BDT {item.totalPrice.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Service Tasks */}
          <ServiceTasksSection orderId={order.id} tasks={tasks} />

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold text-lg text-primary">BDT {order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.completedAt && (
                <div className="flex justify-between text-emerald-600">
                  <span>Completed</span>
                  <span>{new Date(order.completedAt).toLocaleDateString()}</span>
                </div>
              )}
              <div className="border-t pt-3 mt-2">
                <p className="text-xs text-muted-foreground">Service tasks</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs">Planned: {tasks.filter(t => t.status === "planned").length}</span>
                  <span className="text-xs">In Progress: {tasks.filter(t => t.status === "in-progress").length}</span>
                  <span className="text-xs">Done: {tasks.filter(t => t.status === "completed").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
