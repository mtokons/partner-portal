import { fetchPayments, removePayment, togglePaymentHold } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { RowActions } from "@/components/RowActions";

export default async function PaymentsPage() {
  await requireAdmin();
  const payments = await fetchPayments();

  const completed = payments.filter((p) => p.status === "verified");
  const totalReceived = completed.reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter((p) => p.status === "initiated" || p.status === "slip-uploaded" || p.status === "under-review");
  const refunded = payments.filter((p) => p.status === "refunded");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{payments.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <ArrowUpRight className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold">৳{(totalReceived / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold">{pendingPayments.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <ArrowDownRight className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold">{refunded.length}</p>
            <p className="text-xs text-muted-foreground">Refunded</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Method</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Context</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No payments recorded yet</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 text-xs">{p.verifiedAt?.split("T")[0] || "—"}</td>
                    <td className="py-3 px-4 font-medium">{p.payerName}</td>
                    <td className="py-3 px-4 font-medium">{p.currency === "EUR" ? "€" : "৳"}{p.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 capitalize text-xs">{p.paymentMethod.replace(/-/g, " ")}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{p.paymentContext}</td>
                    <td className="py-3 px-4">
                      <Badge variant={p.status === "verified" ? "default" : p.status === "refunded" ? "destructive" : "secondary"}
                        className="capitalize text-xs">{p.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <RowActions
                        entityLabel="payment"
                        isOnHold={!!p.isOnHold}
                        onHold={async () => {
                          "use server";
                          return togglePaymentHold(p.id, !p.isOnHold);
                        }}
                        onDelete={async () => {
                          "use server";
                          return removePayment(p.id);
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
