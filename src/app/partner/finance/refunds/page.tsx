import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getCandidates, getTransactions } from "@/lib/sharepoint";
import { RotateCcw, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import RefundRequestForm from "./RefundRequestForm";

const STATUS_STYLES: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-amber-500 bg-amber-500/10", label: "Pending Review" },
  approved: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-red-500 bg-red-500/10", label: "Rejected" },
  processing: { icon: AlertCircle, color: "text-blue-500 bg-blue-500/10", label: "Processing" },
};

export default async function RefundsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const [candidates, transactions] = await Promise.all([
    getCandidates(partner.id),
    getTransactions(partner.id),
  ]);

  // Only candidates with some deposit can be refunded
  const refundable = candidates.filter(
    (c) => (c.depositAmount || 0) > 0 && c.paymentStatus !== "refunded"
  );

  // Past refund requests
  const refundRequests = transactions
    .filter((t) => t.type === "refund-request" || t.type === "refund")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-purple-500" />
          Refund Requests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submit a refund request for a client payment. All requests are reviewed by SCCG administration.
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-sm">
        <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Refund Policy</p>
        <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>Refund requests require admin approval and may take 5-10 business days.</li>
          <li>Partial refunds are available for services not yet delivered.</li>
          <li>Commission adjustments will be recalculated after refund approval.</li>
        </ul>
      </div>

      <RefundRequestForm candidates={refundable.map((c) => ({
        id: c.id,
        name: c.fullName || "Unknown",
        amountPaid: c.depositAmount || 0,
        category: c.workflowCategory || "—",
      }))} />

      {/* Refund Request History */}
      {refundRequests.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Refund History ({refundRequests.length})
            </h2>
          </div>
          <div className="divide-y">
            {refundRequests.map((r) => {
              const isRefund = r.type === "refund";
              const st = isRefund ? STATUS_STYLES.approved : STATUS_STYLES.pending;
              const Icon = st.icon;
              return (
                <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${st.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.description || "Refund Request"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.date || ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">€{r.amount.toFixed(2)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
