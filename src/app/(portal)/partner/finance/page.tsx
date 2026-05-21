import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getPayouts, getCandidates } from "@/lib/sharepoint";
import { format, parseISO } from "date-fns";
import { DollarSign } from "lucide-react";

export default async function PartnerFinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const [payouts, candidates] = await Promise.all([
    getPayouts(partner.id),
    getCandidates(partner.id),
  ]);

  const clearingQueue = candidates.filter(
    (c) => c.paymentStatus === "fully-paid"
  );

  const totalEarnings = payouts.reduce((s, p) => s + p.net, 0);
  const totalPaid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.net, 0);
  const totalPending = payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + p.net, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Finance Ledger</h1>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Earnings", value: totalEarnings, color: "text-foreground" },
          { label: "Paid Out", value: totalPaid, color: "text-green-600 dark:text-green-400" },
          { label: "Pending", value: totalPending, color: "text-yellow-600 dark:text-yellow-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>
              €{value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Payouts ledger */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-foreground">Payout History</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No payouts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net (Your Share)</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.createdAt ? format(parseISO(p.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.relatedOrderNumber ?? p.relatedOrderId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-right">€{p.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    €{p.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === "paid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Clearing queue */}
      {clearingQueue.length > 0 && (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Clearing Queue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Candidates with fully-paid status pending payout.
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
              {clearingQueue.length} pending
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Your Share</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clearingQueue.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.workflowCategory}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                    €{c.partnerShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
