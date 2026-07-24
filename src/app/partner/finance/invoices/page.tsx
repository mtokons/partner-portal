import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getInvoices, getCandidates } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { dual } from "@/lib/formatCurrency";
import { format, parseISO } from "date-fns";
import { FileText, CheckCircle, Clock, AlertTriangle, Download, Send } from "lucide-react";
import Link from "next/link";
import CreateInvoiceButton from "./CreateInvoiceButton";
import InvoiceActions from "./InvoiceActions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500",
  sent: "bg-blue-500/10 text-blue-500",
  paid: "bg-emerald-500/10 text-emerald-500",
  overdue: "bg-red-500/10 text-red-500",
  cancelled: "bg-gray-500/10 text-gray-400",
};

export default async function InvoicesPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const secCur = partner.preferredCurrency || "BDT";
  const [invoices, candidates, rate] = await Promise.all([
    getInvoices(partner.id),
    getCandidates(partner.id),
    secCur !== "EUR" ? getEurToRate(secCur) : Promise.resolve(1),
  ]);
  const sorted = [...invoices].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + i.amount, 0);

  // Candidates available for invoicing
  const invoiceCandidates = candidates
    .filter((c) => c.paymentStatus !== "fully-paid" && c.paymentStatus !== "refunded" && (c.totalServiceFee || 0) > 0)
    .map((c) => ({ id: c.id, name: c.fullName || "Unknown", fee: c.totalServiceFee || 0 }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Invoices
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage invoices for your client transactions.
          </p>
        </div>
        <CreateInvoiceButton candidates={invoiceCandidates} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Invoices</p>
          <p className="text-3xl font-bold text-foreground mt-1">{invoices.length}</p>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Paid</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {dual(totalPaid, secCur, rate)}
          </p>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Outstanding</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {dual(totalOutstanding, secCur, rate)}
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      {sorted.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No invoices yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Invoices will appear here when orders are processed.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-medium">{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                    <td className="px-5 py-4 font-medium">{inv.clientName}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {inv.createdAt ? format(parseISO(inv.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {inv.dueDate ? format(parseISO(inv.dueDate), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">{dual(inv.amount, secCur, rate)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${STATUS_STYLES[inv.status] || STATUS_STYLES.draft}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <InvoiceActions invoiceId={inv.id} invoiceNumber={inv.invoiceNumber || inv.id.slice(0, 8)} status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
