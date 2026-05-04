import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getExpenses } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AddExpenseButton from "./AddExpenseButton";
import OrderStatusPieChart from "@/components/charts/OrderStatusPieChart";
import { RowActions } from "@/components/RowActions";
import { removeExpense, holdExpense } from "@/lib/row-actions";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const [expenses, rate] = await Promise.all([getExpenses(user.role === "admin" ? undefined : user.partnerId), loadRate()]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const catMap = new Map<string, number>();
  expenses.forEach((e) => {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
  });
  const catData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        {user.role === "partner" && <AddExpenseButton partnerId={user.partnerId} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Total Expenses</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-600">{fmtBdt(totalExpenses, rate)}</div></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
          <CardContent>
            <OrderStatusPieChart data={catData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Expense Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell className="font-semibold text-red-600">{fmtBdt(expense.amount, expense.amountEur ?? rate, { compact: true })}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      entityLabel="expense"
                      isOnHold={!!expense.isOnHold}
                      onHold={async () => { "use server"; return holdExpense(expense.id, !expense.isOnHold); }}
                      onDelete={async () => { "use server"; return removeExpense(expense.id); }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
