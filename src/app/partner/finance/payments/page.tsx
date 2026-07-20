import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getCandidates, getTransactions } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { isBkashConfigured } from "@/lib/gateways/bkash";
import { isNagadConfigured } from "@/lib/gateways/nagad";
import { dual } from "@/lib/formatCurrency";
import { format, parseISO } from "date-fns";
import { CreditCard, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from "lucide-react";
import PaymentForm from "./PaymentForm";

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  payment: { color: "text-emerald-500 bg-emerald-500/10", label: "Payment" },
  "refund-request": { color: "text-amber-500 bg-amber-500/10", label: "Refund Request" },
  refund: { color: "text-red-500 bg-red-500/10", label: "Refund" },
  deposit: { color: "text-blue-500 bg-blue-500/10", label: "Deposit" },
};

// Payment outcome banners shown after redirect from gateway callbacks
const PAYMENT_BANNERS: Record<string, { msg: string; style: string }> = {
  "bkash-success": { msg: "bKash payment completed successfully.", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" },
  "nagad-success": { msg: "Nagad payment completed successfully.", style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" },
  cancelled:       { msg: "Payment was cancelled.", style: "bg-amber-500/10 border-amber-500/30 text-amber-600" },
  error:           { msg: "Something went wrong with the payment. Please try again.", style: "bg-red-500/10 border-red-500/30 text-red-600" },
  "auth-required": { msg: "Session expired during payment. Please log in again.", style: "bg-red-500/10 border-red-500/30 text-red-600" },
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;

  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const secCur = partner.preferredCurrency || "BDT";

  // Always fetch BDT rate for payment methods denominated in BDT
  const [candidates, transactions, rate, bdtRate] = await Promise.all([
    getCandidates(partner.id),
    getTransactions(partner.id),
    secCur !== "EUR" ? getEurToRate(secCur) : Promise.resolve(1),
    secCur !== "BDT" ? getEurToRate("BDT") : Promise.resolve(1),
  ]);

  // Use secCur rate for display, bdtRate for BDT payment fields
  const effectiveBdtRate = secCur === "BDT" ? rate : bdtRate;

  // Calculate totals
  const totalServiceFees = candidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
  const sccgShare = candidates.reduce((s, c) => s + (c.sccgShare || 0), 0);
  const totalPayments = transactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
  const payableToSccg = Math.max(0, sccgShare - totalPayments);

  const sorted = [...transactions].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const banner = payment ? PAYMENT_BANNERS[payment] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          Payments to SCCG
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Record payments and view your transaction history with SCCG.
        </p>
      </div>

      {/* Gateway callback banner */}
      {banner && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${banner.style}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {banner.msg}
        </div>
      )}

      {/* Payable Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Fees Collected</p>
          <p className="text-2xl font-bold text-foreground mt-1">{dual(totalServiceFees, secCur, rate)}</p>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">SCCG Share</p>
          <p className="text-2xl font-bold text-foreground mt-1">{dual(sccgShare, secCur, rate)}</p>
        </div>
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Already Paid</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{dual(totalPayments, secCur, rate)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-2 border-amber-500/20 rounded-2xl p-5">
          <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-semibold">Payable to SCCG</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{dual(payableToSccg, secCur, rate)}</p>
        </div>
      </div>

      {/* Payment Form */}
      <PaymentForm
        totalPayable={payableToSccg}
        bdtRate={effectiveBdtRate}
        bkashEnabled={isBkashConfigured()}
        nagadEnabled={isNagadConfigured()}
        sccgBkashNumber={process.env.SCCG_BKASH_NUMBER}
        sccgNagadNumber={process.env.SCCG_NAGAD_NUMBER}
        cityBankAccount={process.env.CITYBANK_ACCOUNT_NO}
        cityBankName={process.env.CITYBANK_ACCOUNT_NAME}
        cityBankBranch={process.env.CITYBANK_BRANCH}
        cityBankRoutingNo={process.env.CITYBANK_ROUTING_NO}
        cityBankSwift={process.env.CITYBANK_SWIFT}
      />

      {/* Transaction History */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Transaction History ({sorted.length})
          </h2>
        </div>
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm opacity-60">Record your first payment above.</p>
          </div>
        ) : (
          <div className="divide-y">
            {sorted.map((t) => {
              const style = TYPE_STYLES[t.type] || TYPE_STYLES.payment;
              return (
                <div key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${style.color} flex items-center justify-center shrink-0`}>
                    {t.type === "payment" ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : t.type === "refund" || t.type === "refund-request" ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.description || style.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.reference && `Ref: ${t.reference} · `}
                      {t.date ? format(parseISO(t.date), "MMM d, yyyy HH:mm") : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${t.type === "payment" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {t.type === "payment" ? "+" : ""}{dual(t.amount, secCur, rate)}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
