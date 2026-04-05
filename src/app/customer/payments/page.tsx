import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getCustomerPackages } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, CheckCircle, AlertTriangle } from "lucide-react";

export default async function CustomerPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");
  const user = session.user as SessionUser;

  const [packages, rate] = await Promise.all([getCustomerPackages(user.id), loadRate()]);

  const totalInvested = packages.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = packages.reduce((s, p) => s + p.amountPaid, 0);
  const totalDue = packages.reduce((s, p) => s + (p.totalAmount - p.amountPaid), 0);

  // Build a payment timeline from packages
  const paymentRecords = packages.map((pkg) => ({
    packageName: pkg.packageName,
    totalAmount: pkg.totalAmount,
    amountPaid: pkg.amountPaid,
    amountDue: pkg.totalAmount - pkg.amountPaid,
    status: pkg.totalAmount - pkg.amountPaid === 0 ? "paid" : pkg.amountPaid === 0 ? "pending" : "partial",
    startDate: pkg.startDate,
    endDate: pkg.endDate,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-gray-500">Total Invested</CardTitle>
            <CreditCard className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtBdt(totalInvested, rate, { compact: true })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-gray-500">Amount Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fmtBdt(totalPaid, rate, { compact: true })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-gray-500">Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDue > 0 ? "text-orange-600" : "text-green-600"}`}>
              {fmtBdt(totalDue, rate, { compact: true })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment breakdown per package */}
      <Card>
        <CardHeader>
          <CardTitle>Package Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRecords.map((rec, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{rec.packageName}</TableCell>
                  <TableCell>{fmtBdt(rec.totalAmount, rate, { compact: true })}</TableCell>
                  <TableCell className="text-green-600 font-medium">{fmtBdt(rec.amountPaid, rate, { compact: true })}</TableCell>
                  <TableCell className={rec.amountDue > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                    {fmtBdt(rec.amountDue, rate, { compact: true })}
                  </TableCell>
                  <TableCell>
                    <Badge className={rec.status === "paid" ? "bg-green-100 text-green-800" : rec.status === "partial" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                      {rec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(rec.startDate).toLocaleDateString("en-GB")} – {new Date(rec.endDate).toLocaleDateString("en-GB")}
                  </TableCell>
                </TableRow>
              ))}
              {paymentRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">No payment records</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay now CTA */}
      {totalDue > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-orange-800">You have an outstanding balance of {fmtBdt(totalDue, rate, { compact: true })}</p>
                <p className="text-sm text-orange-600 mt-1">
                  Please contact your partner account manager to arrange payment, or use the payment reference below.
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-700">{fmtBdt(totalDue, rate, { compact: true })}</p>
                <p className="text-xs text-orange-500">due now</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
