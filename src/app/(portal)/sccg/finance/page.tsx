import Link from "next/link";
import { ArrowRight, Building2, HandCoins, ReceiptText, Users } from "lucide-react";
import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchFinanceSummaryAction } from "./actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export const dynamic = "force-dynamic";

export default async function SccgFinancePage() {
  await requireSccgAccess();
  const result = await fetchFinanceSummaryAction();
  const summary = result.data;

  if (!result.success || !summary) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">{result.error || "Failed to load finance overview."}</div>;
  }

  const cards = [
    { label: "SCCG Share", value: summary.sccgRevenue, icon: Building2, detail: "Candidate service allocation", tone: "text-blue-600" },
    { label: "Partner Share", value: summary.partnerRevenue, icon: Users, detail: `${summary.partnerCount} partner accounts`, tone: "text-violet-600" },
    { label: "Collected", value: summary.paid, icon: HandCoins, detail: "Payments received", tone: "text-emerald-600" },
    { label: "Due Amount", value: summary.outstanding, icon: ReceiptText, detail: "Outstanding receivables", tone: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">SCCG and partner finance in one operational view.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`flex items-center gap-2 text-sm ${card.tone}`}><card.icon className="h-4 w-4" />{card.label}</div>
            <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrency(card.value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">SCCG Finance</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Allocated SCCG share</dt><dd className="font-semibold">{formatCurrency(summary.sccgRevenue)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Recorded expenses</dt><dd className="font-semibold text-red-600">{formatCurrency(summary.expenses)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Refunds issued</dt><dd className="font-semibold text-red-600">{formatCurrency(summary.refundTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Registered clients</dt><dd className="font-semibold">{summary.customerCount}</dd></div>
          </dl>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">Partner Finance</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Partner revenue</dt><dd className="font-semibold">{formatCurrency(summary.partnerRevenue)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Outstanding receivables</dt><dd className="font-semibold text-amber-600">{formatCurrency(summary.outstanding)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Active partner records</dt><dd className="font-semibold">{summary.partnerCount}</dd></div>
          </dl>
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { href: "/sccg/expert-payments", title: "Expert Payments", description: "Approve and settle expert session earnings." },
          { href: "/sccg/refunds", title: "Refunds", description: "Review partner requests and issue approved refunds." },
          { href: "/sccg/partner-performance", title: "Partner Performance", description: "Compare revenue, collections, and outstanding balances." },
          { href: "/sccg/finance/invoices", title: "Invoices", description: "Review invoice status and due dates." },
          { href: "/sccg/finance/payments", title: "Payments", description: "Inspect the transaction ledger." },
          { href: "/sccg/finance/payouts", title: "Payouts", description: "Track partner, expert and referral payouts." },
          { href: "/sccg/finance/expenses", title: "Expenses", description: "Record and review SCCG operating expenses." },
          { href: "/sccg/finance/reports", title: "Reports", description: "Reconcile allocations, collections and costs." },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="group rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-muted/40">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-foreground">{item.title}</h2><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}