import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getPayouts, getCandidates } from "@/lib/sharepoint";
import { format, parseISO } from "date-fns";
import { DollarSign, Clock, CheckCircle } from "lucide-react";
import FinanceLedgerClient from "./FinanceLedgerClient";

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

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-2xl">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Finance Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage candidate sales, view real-time commission splits, track payouts, and record transactions.
          </p>
        </div>
      </div>

      {/* Main Interactive Spreadsheet Grid */}
      <FinanceLedgerClient initialCandidates={candidates} partner={partner} />

      {/* Supplementary Analytics Columns: Payouts & Clearing Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payout History Panel */}
        <div className="bg-card border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md lg:col-span-2">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Payout History
            </h2>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              {payouts.length} processed
            </span>
          </div>
          {payouts.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center min-h-[220px]">
              <DollarSign className="w-8 h-8 opacity-20 mb-2" />
              <p className="font-medium">No payouts processed yet</p>
              <p className="text-xs opacity-60 mt-0.5">Earned commission splits will appear here after confirmation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Gross (€)</th>
                    <th className="px-4 py-3 text-right">Net (€)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-medium">
                        {p.createdAt ? format(parseISO(p.createdAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {p.relatedOrderNumber ?? p.relatedOrderId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        €{p.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">
                        €{p.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                            p.status === "paid"
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Clearing Queue Panel */}
        <div className="bg-card border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Clearing Queue
            </h2>
            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
              {clearingQueue.length} pending
            </span>
          </div>
          {clearingQueue.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center min-h-[220px]">
              <Clock className="w-8 h-8 opacity-20 mb-2" />
              <p className="font-medium">Clearing queue is empty</p>
              <p className="text-xs opacity-60 mt-0.5">Fully-paid candidates pending payout splits appear here.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[300px] divide-y divide-white/5">
              {clearingQueue.map((c) => (
                <div key={c.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{c.fullName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.workflowCategory}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-400">
                      €{c.partnerShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Partner Share</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
