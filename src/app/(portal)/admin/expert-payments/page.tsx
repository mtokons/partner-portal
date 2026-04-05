import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getExpertPayments } from "@/lib/sharepoint";
import { formatEurWithRate } from "@/lib/formatCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ApprovePaymentButton from "./ApprovePaymentButton";

// Format expert payments as BDT primary with EUR equivalent when rate available
let _rate: number | null = null;

function fmt(n: number) {
  return formatEurWithRate(n, _rate ?? undefined, 2);
}

const statusColor: Record<string, string> = {
  eligible: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  pending: "bg-gray-100 text-gray-600",
  disputed: "bg-red-100 text-red-700",
};

export default async function AdminExpertPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const payments = await getExpertPayments();

  try {
    const { getBdtToEurRate } = await import("@/lib/currency");
    _rate = await getBdtToEurRate();
  } catch (err) {
    _rate = null;
  }

  const totalEligible = payments.filter((p) => p.status === "eligible").reduce((s, p) => s + p.amount, 0);
  const totalApproved = payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expert Payments</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve payments for completed sessions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Awaiting Approval</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-700">{fmt(totalEligible)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Approved</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-700">{fmt(totalApproved)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Paid Out</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-700">{fmt(totalPaid)}</p></CardContent>
        </Card>
      </div>

      {/* Payment Table */}
      <Card>
        <CardHeader><CardTitle>All Expert Payments</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="pb-3 font-medium">Expert</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Eligible Date</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 font-medium">{p.expertName}</td>
                    <td className="py-2.5">{p.customerName}</td>
                    <td className="py-2.5">{fmt(p.amount)}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.status] || ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500">
                      {p.eligibleAt ? new Date(p.eligibleAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="py-2.5">
                      {p.status === "eligible" && (
                        <ApprovePaymentButton paymentId={p.id} adminId={user.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
