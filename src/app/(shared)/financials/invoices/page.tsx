import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getInvoices } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DownloadInvoiceButton from "./DownloadInvoiceButton";
import { RowActions } from "@/components/RowActions";
import { removeSPInvoice, holdSPInvoice } from "@/lib/row-actions";

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const [invoices, rate] = await Promise.all([
    getInvoices(user.role === "admin" ? undefined : user.partnerId),
    loadRate(),
  ]);

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Invoiced</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtBdt(totalAmount, rate)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Paid</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{fmtBdt(paidAmount, rate)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Overdue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{fmtBdt(overdueAmount, rate)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Download</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.id.toUpperCase()}</TableCell>
                  <TableCell>{invoice.clientName || invoice.clientId}</TableCell>
                  <TableCell className="font-semibold">{fmtBdt(invoice.amount, invoice.amountEur != null ? null : rate, { compact: true })}{invoice.amountEur != null ? ` · €${invoice.amountEur.toFixed(2)}` : ""}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[invoice.status] || ""}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DownloadInvoiceButton invoiceId={invoice.id} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      entityLabel="invoice"
                      isOnHold={!!invoice.isOnHold}
                      onHold={async () => { "use server"; return holdSPInvoice(invoice.id, !invoice.isOnHold); }}
                      onDelete={async () => { "use server"; return removeSPInvoice(invoice.id); }}
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
