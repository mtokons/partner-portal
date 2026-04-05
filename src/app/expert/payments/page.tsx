import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getExpertPayments, getExpertById } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusLabel: Record<string, { label: string; cls: string }> = {
  eligible: { label: "Awaiting Approval", cls: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", cls: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-700" },
  pending: { label: "Pending", cls: "bg-gray-100 text-gray-600" },
  disputed: { label: "Disputed", cls: "bg-red-100 text-red-700" },
};

export default async function ExpertPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  const [[expert, payments], rate] = await Promise.all([
    Promise.all([getExpertById(user.id), getExpertPayments(user.id)]),
    loadRate(),
  ]);

  function fmt(n: number) { return fmtBdt(n, rate, { compact: true }); }

  const totalEarned = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const approved = payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const eligible = payments.filter((p) => p.status === "eligible").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-gray-500 text-sm mt-1">Rate: {fmtBdt(expert?.ratePerSession || 0, rate, { compact: true })} per session</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Paid Out</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-700">{fmt(totalEarned)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Approved</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-700">{fmt(approved)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Awaiting Approval</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-700">{fmt(eligible)}</p></CardContent>
        </Card>
      </div>

      {/* Payment Records */}
      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="pb-3 font-medium">Session</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Eligible Date</th>
                  <th className="pb-3 font-medium">Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">No payment records yet.</td></tr>
                ) : (
                  payments.map((p) => {
                    const st = statusLabel[p.status] || { label: p.status, cls: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-3 font-mono text-xs">{p.sessionId}</td>
                        <td className="py-3">{p.customerName}</td>
                        <td className="py-3 font-medium">{fmt(p.amount)}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="py-3 text-gray-500">
                          {p.eligibleAt ? new Date(p.eligibleAt).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="py-3 text-gray-500">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-GB") : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
