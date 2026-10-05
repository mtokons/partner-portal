import { requirePermission } from "@/lib/permissions";
import { getCustomers, getTransactions } from "@/lib/sharepoint";
import { recordIncomeAction } from "../actions";
import { TrendingUp, Euro, CalendarDays, User2, StickyNote, BadgeCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(amount);
}

export default async function FinanceIncomePage() {
  await requirePermission("payment.record");

  const [customers, transactions] = await Promise.all([
    getCustomers(),
    getTransactions(),
  ]);

  // Only income-type transactions (purchase / payment)
  const incomeEntries = transactions
    .filter((t) => t.type === "purchase" || t.type === "payment")
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalIncome = incomeEntries.reduce((sum, t) => sum + (t.amountEur ?? t.amount), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyIncome = incomeEntries
    .filter((t) => t.date.startsWith(thisMonth))
    .reduce((sum, t) => sum + (t.amountEur ?? t.amount), 0);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-emerald-500" />
          Income Entry
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record sales income and installment payments received from clients. The client receives a payment confirmation notification automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income Recorded</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{fmt(totalIncome)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">All time</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{fmt(monthlyIncome)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Entries</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{incomeEntries.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Purchase &amp; payment records</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Euro className="h-4 w-4 text-emerald-500" />
          Record New Income
        </h2>
        <p className="text-xs text-muted-foreground">
          Use <strong>Full Payment</strong> for complete upfront payments, or <strong>Installment / Partial</strong> for clients paying in parts.
          A payment confirmation notification will be sent to the client after saving.
        </p>

        <form action={recordIncomeAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="income-client" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <User2 className="h-3.5 w-3.5" /> Client
              </label>
              <select
                id="income-client"
                name="clientId"
                required
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select client —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="income-type" className="text-xs font-medium text-muted-foreground">
                Payment Type
              </label>
              <select
                id="income-type"
                name="paymentType"
                required
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="payment">Full Payment (complete settlement)</option>
                <option value="purchase">Installment / Partial Payment</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="income-amount" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Euro className="h-3.5 w-3.5" /> Amount (EUR)
              </label>
              <input
                id="income-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="e.g. 1500.00"
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="income-ref" className="text-xs font-medium text-muted-foreground">
                Reference / Invoice No.
              </label>
              <input
                id="income-ref"
                name="reference"
                type="text"
                required
                placeholder="e.g. INV-2026-001"
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="income-date" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Payment Date
              </label>
              <input
                id="income-date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="income-desc" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <StickyNote className="h-3.5 w-3.5" /> Description (optional)
              </label>
              <input
                id="income-desc"
                name="description"
                type="text"
                placeholder="e.g. Monthly instalment #2"
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <BadgeCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              After saving, the selected client will automatically receive a <strong>Payment Confirmation</strong> notification in their portal.
            </p>
          </div>

          <button
            type="submit"
            className="h-10 px-6 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Save Income Entry
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Income History</h2>
          <span className="text-xs text-muted-foreground">{incomeEntries.length} records</span>
        </div>
        {incomeEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No income entries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {incomeEntries.map((entry) => {
                  const client = customers.find((c) => c.id === entry.clientId);
                  return (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{entry.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{entry.reference}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.type === "payment"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                        }`}>
                          {entry.type === "payment" ? "Full Payment" : "Installment"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{client?.name || entry.clientId}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{entry.description || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmt(entry.amountEur ?? entry.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
