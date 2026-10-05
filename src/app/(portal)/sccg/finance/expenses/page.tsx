import { requirePermission } from "@/lib/permissions";
import { getExpenses } from "@/lib/sharepoint";
import { createSccgExpenseAction } from "../actions";
import { Receipt, CalendarDays, StickyNote, Tag, Euro } from "lucide-react";

export const dynamic = "force-dynamic";

const EXPENSE_CATEGORIES = [
  "Salary",
  "Office Rent",
  "Software & Subscriptions",
  "Marketing & Advertising",
  "Travel & Transport",
  "Utilities",
  "Equipment & Hardware",
  "Professional Services",
  "Training & Development",
  "Miscellaneous",
];

function fmt(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(amount);
}

export default async function FinanceExpensesPage() {
  await requirePermission("payment.record");

  const expenses = (await getExpenses()).sort((a, b) => b.date.localeCompare(a.date));

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amountEur ?? e.amount), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + (e.amountEur ?? e.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + (e.amountEur ?? e.amount);
  }
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-red-500" />
          Expenses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record and review all SCCG operating expenses. Track spending by category each month.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{fmt(totalExpenses)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">All time · {expenses.length} entries</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{fmt(monthlyExpenses)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Top Category</p>
          <p className="mt-2 text-2xl font-bold text-foreground truncate">{topCategory?.[0] ?? "—"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{topCategory ? fmt(topCategory[1]) : "No data yet"}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Tag className="h-4 w-4 text-red-500" />
          Record New Expense
        </h2>

        <form action={createSccgExpenseAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="expense-category" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Category
              </label>
              <select
                id="expense-category"
                name="category"
                required
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select category —</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="expense-desc" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <StickyNote className="h-3.5 w-3.5" /> Description
              </label>
              <input
                id="expense-desc"
                name="description"
                required
                type="text"
                placeholder="e.g. Office rent for September"
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="expense-amount" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Euro className="h-3.5 w-3.5" /> Amount (EUR)
              </label>
              <input
                id="expense-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="e.g. 850.00"
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="expense-date" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Date
              </label>
              <input
                id="expense-date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              className="h-10 px-6 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Record Expense
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Expense History</h2>
          <span className="text-xs text-muted-foreground">{expenses.length} records</span>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No expenses recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{expense.date?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{expense.description}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(expense.amountEur ?? expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
