import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getOrders, getPartners } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/RowActions";
import { removeOrder, toggleOrderHold } from "./actions";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const [orders, partners] = await Promise.all([getOrders(), getPartners()]);
  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  let rate: number | null = null;
  try {
    const { getBdtToEurRate } = await import("@/lib/currency");
    rate = await getBdtToEurRate();
  } catch (err) {
    rate = null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>

      <div className="grid grid-cols-3 gap-4 text-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{orders.length}</div>
            <div className="text-sm text-gray-500 mt-1">Total Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-gray-500 mt-1">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">BDT {totalValue.toFixed(0)}{rate ? ` · €${(totalValue * rate).toFixed(0)}` : ""}</div>
            <div className="text-sm text-gray-500 mt-1">Total Value</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Orders ({orders.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((order) => {
                  const partner = partnerMap.get(order.partnerId);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="text-sm">{partner?.company || order.partnerId}</TableCell>
                      <TableCell className="text-sm">{order.clientName || order.clientId}</TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">
                        {order.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
                      </TableCell>
                      <TableCell className="font-semibold">BDT {order.totalAmount.toFixed(2)}{rate ? ` · €${(order.totalAmount * rate).toFixed(2)}` : ""}</TableCell>
                      <TableCell>
                        <Badge className={statusColor[order.status] || ""}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          entityLabel="order"
                          isOnHold={!!order.isOnHold}
                          onHold={async () => {
                            "use server";
                            return toggleOrderHold(order.id, !order.isOnHold);
                          }}
                          onDelete={async () => {
                            "use server";
                            return removeOrder(order.id);
                          }}
                          editHref={`/admin/orders/${order.id}/edit`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 py-8">No orders</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
