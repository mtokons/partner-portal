import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getCustomerPackages } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

export default async function CustomerInvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");
  const user = session.user as SessionUser;

  const [packages, rate] = await Promise.all([getCustomerPackages(user.id), loadRate()]);

  // Build invoice records from packages (one invoice per package purchase)
  const invoices = packages.map((pkg, idx) => ({
    id: `INV-${pkg.id.toUpperCase()}`,
    packageName: pkg.packageName,
    amount: pkg.totalAmount,
    amountPaid: pkg.amountPaid,
    status: pkg.totalAmount - pkg.amountPaid === 0 ? "paid" : pkg.amountPaid === 0 ? "unpaid" : "partial",
    issueDate: pkg.createdAt,
    dueDate: pkg.endDate,
    expertName: pkg.expertName,
  }));

  const statusColor: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    unpaid: "bg-red-100 text-red-800",
    partial: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs font-medium">{inv.id}</TableCell>
                  <TableCell className="text-sm">
                    <div>{inv.packageName}</div>
                    {inv.expertName && <div className="text-xs text-gray-400">Expert: {inv.expertName}</div>}
                  </TableCell>
                  <TableCell className="font-semibold">{fmtBdt(inv.amount, rate, { compact: true })}</TableCell>
                  <TableCell className="text-green-600">{fmtBdt(inv.amountPaid, rate, { compact: true })}</TableCell>
                  <TableCell className={inv.amount - inv.amountPaid > 0 ? "text-orange-600 font-semibold" : "text-green-600"}>
                    {fmtBdt(inv.amount - inv.amountPaid, rate, { compact: true })}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColor[inv.status] || ""}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(inv.issueDate).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 cursor-pointer">
                      <FileText className="h-3 w-3" />
                      Download
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-8">No invoices yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
