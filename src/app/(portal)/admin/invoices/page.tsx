import { fetchInvoices } from "../payments/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Clock, CheckCircle } from "lucide-react";

export default async function InvoicesPage() {
  const invoices = await fetchInvoices();

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const pendingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "draft");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{invoices.length}</p>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-violet-500 mb-1" />
            <p className="text-2xl font-bold">৳{(totalBilled / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total Billed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{paidInvoices.length}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold">{pendingInvoices.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Invoice #</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No invoices created yet</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 capitalize text-xs">{inv.invoiceType.replace(/-/g, " ")}</td>
                    <td className="py-3 px-4 font-medium">{inv.clientName}</td>
                    <td className="py-3 px-4 font-medium">{inv.currency === "EUR" ? "€" : "৳"}{inv.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-xs">{inv.dueDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        inv.status === "paid" ? "default" :
                        inv.status === "overdue" ? "destructive" :
                        inv.status === "sent" ? "outline" : "secondary"
                      } className="capitalize text-xs">{inv.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
