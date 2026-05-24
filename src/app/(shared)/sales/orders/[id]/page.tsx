import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOrderById, getSalesOrderItems, getServiceTasks } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, ArrowLeft, ClipboardList, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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

  // Friendly "not found" — don't call notFound() as it renders blank
  if (!order) {
    return (
      <div className="space-y-6 page-enter">
        <div className="flex items-center gap-3">
          <Link href="/sales/orders">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
        </div>
        <Card className="rounded-2xl border-amber-500/20 bg-amber-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-black text-foreground">Order Not Found</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              The order with ID <span className="font-mono font-bold text-foreground">#{id}</span> could not be loaded.
              It may have been saved with an older reference format, or the SharePoint list may not contain this item yet.
            </p>
            <p className="text-xs text-muted-foreground bg-background border border-border rounded-xl px-4 py-2">
              💡 If you just placed this order, please wait a moment and refresh — SharePoint can take a few seconds to index new items.
            </p>
            <div className="flex gap-3 mt-2">
              <Link href="/sales/orders">
                <Button variant="outline">View All Orders</Button>
              </Link>
              <Link href="/marketplace">
                <Button>Go to Marketplace</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "admin" && order.createdBy !== user.id) redirect("/sales/orders");

  const cfg = statusConfig[order.status] || statusConfig.pending;
  const requiresPaymentVerification = order.notes?.includes("Payment verification: pending-admin-verification") || false;
  const isVerified = order.notes?.includes("Payment verification: verified") || false;

  // Parse payment info from notes
  const notesLines = (order.notes || "").split("\n");
  const paymentMethod = notesLines.find(l => l.startsWith("Marketplace payment method:"))?.replace("Marketplace payment method:", "").trim() || "";
  const paymentReference = notesLines.find(l => l.startsWith("Payment reference:"))?.replace("Payment reference:", "").trim() || "";
  const submittedAt = notesLines.find(l => l.startsWith("Payment submitted at:"))?.replace("Payment submitted at:", "").trim() || "";

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
              {requiresPaymentVerification && !isVerified && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
                  <Clock className="h-3 w-3 mr-1" /> Awaiting Payment Verification
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {order.salesOfferId !== "DIRECT_BUY"
                ? <>From offer <Link href={`/sales/offers/${order.salesOfferId}`} className="text-primary hover:underline">{order.offerNumber}</Link>{" · "}</>
                : "Marketplace Direct Purchase · "}
              Created {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <OrderActions order={order} isAdmin={user.role === "admin"} requiresPaymentVerification={requiresPaymentVerification} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Verification Timeline */}
          {requiresPaymentVerification && (
            <Card className="border-amber-500/20 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Payment Verification Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {/* Step 1 */}
                  <div className="flex gap-4 pb-6 relative">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    </div>
                    <div className="pb-4">
                      <p className="font-bold text-sm text-foreground">Order Placed</p>
                      <p className="text-xs text-muted-foreground">{submittedAt ? new Date(submittedAt).toLocaleString() : new Date(order.createdAt).toLocaleString()}</p>
                      {paymentMethod && <p className="text-xs mt-1 text-muted-foreground">via <span className="font-semibold capitalize">{paymentMethod.replace("-", " ")}</span></p>}
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex gap-4 pb-6 relative">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    </div>
                    <div className="pb-4">
                      <p className="font-bold text-sm text-foreground">Payment Reference Submitted</p>
                      {paymentReference && paymentReference !== "N/A" && (
                        <p className="text-xs font-mono bg-muted px-2 py-0.5 rounded mt-1 inline-block">{paymentReference}</p>
                      )}
                    </div>
                  </div>
                  {/* Step 3 - Pending */}
                  <div className="flex gap-4 pb-6 relative">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 ${isVerified ? "bg-emerald-100 border-emerald-500" : "bg-amber-50 border-amber-400"}`}>
                        {isVerified
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />}
                      </div>
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    </div>
                    <div className="pb-4">
                      <p className="font-bold text-sm text-foreground">Admin Verification</p>
                      <p className="text-xs text-muted-foreground">{isVerified ? "Payment has been verified by admin" : "Waiting for admin to verify payment..."}</p>
                    </div>
                  </div>
                  {/* Step 4 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 ${isVerified ? "bg-emerald-100 border-emerald-500" : "bg-muted border-muted-foreground/30"}`}>
                        {isVerified
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : <CheckCircle2 className="h-4 w-4 text-muted-foreground/40" />}
                      </div>
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${isVerified ? "text-emerald-600" : "text-muted-foreground/60"}`}>Service Activated</p>
                      <p className="text-xs text-muted-foreground">{isVerified ? "Services are now active" : "Pending verification"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Client</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{order.clientName || "—"}</p>
              <p className="text-sm text-muted-foreground">{order.clientEmail || "—"}</p>
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
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 pb-6">No items found for this order yet.</p>
              ) : (
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
              )}
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

