import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getCandidates, getInvoices } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { dual } from "@/lib/formatCurrency";

import { format, parseISO } from "date-fns";
import { AlertTriangle, CreditCard, Clock } from "lucide-react";
import Link from "next/link";

export default async function DuePaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const secCur = partner.preferredCurrency || "BDT";
  const [candidates, invoices, rate] = await Promise.all([
    getCandidates(partner.id),
    getInvoices(partner.id),
    secCur !== "EUR" ? getEurToRate(secCur) : Promise.resolve(1),
  ]);

  const margin = partner.marginPercentage || 15;

  // Candidates with outstanding balance (partially paid or pending)
  const dueCandidates = candidates.filter(
    (c) => c.paymentStatus !== "fully-paid" && c.paymentStatus !== "refunded" && c.totalServiceFee > 0
  );

  // Overdue invoices
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const sentInvoices = invoices.filter((i) => i.status === "sent");

  // Total due = sum of remaining balance per candidate + overdue invoices
  const candidateDue = dueCandidates.reduce((s, c) => s + (c.totalServiceFee - (c.depositAmount || 0)), 0);
  const invoiceDue = [...overdueInvoices, ...sentInvoices].reduce((s, i) => s + i.amount, 0);
  const totalDue = candidateDue > 0 ? candidateDue : invoiceDue;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-amber-500" />
          Due Payments
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track outstanding payments from candidates and settle amounts with SCCG.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Due</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {dual(totalDue, secCur, rate)}
          </p>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overdue Invoices</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{overdueInvoices.length}</p>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pending Candidates</p>
          <p className="text-3xl font-bold text-foreground mt-1">{dueCandidates.length}</p>
        </div>
      </div>

      {/* Due Candidates Table */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Candidates with Outstanding Balance
          </h2>
        </div>
        {dueCandidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium">All candidates are settled</p>
            <p className="text-sm opacity-60">No outstanding payments at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SCCG ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Fee</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dueCandidates.map((c) => {
                  const totalFee = c.totalServiceFee || 0;
                  const paid = c.depositAmount || 0;
                  const due = totalFee - paid;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{c.sccgId}</td>
                      <td className="px-5 py-4">
                        <Link href={`/partner/candidates/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.fullName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground capitalize">{c.workflowCategory || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          c.paymentStatus === "pending"
                            ? "bg-amber-500/10 text-amber-500"
                            : c.paymentStatus === "deposit-paid"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-orange-500/10 text-orange-500"
                        }`}>
                          {(c.paymentStatus || "pending").replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">{dual(totalFee, secCur, rate)}</td>
                      <td className="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400">{dual(paid, secCur, rate)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-red-600 dark:text-red-400">
                        {dual(due, secCur, rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overdue Invoices */}
      {overdueInvoices.length > 0 && (
        <div className="bg-card border border-red-500/20 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b bg-red-500/5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Overdue Invoices
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overdueInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/20">
                    <td className="px-5 py-4 font-medium">{inv.clientName}</td>
                    <td className="px-5 py-4 text-red-500 font-medium">
                      {inv.dueDate ? format(parseISO(inv.dueDate), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">{dual(inv.amount, secCur, rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Make Payment Link */}
      <div className="bg-card border rounded-2xl p-6 text-center">
        <p className="text-muted-foreground text-sm mb-3">Ready to settle outstanding amounts with SCCG?</p>
        <Link
          href="/partner/finance/payments"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Make a Payment
        </Link>
      </div>
    </div>
  );
}
