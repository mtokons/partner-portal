import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getClientById, getTransactionsByClient, getInstallmentsByClient, getOrders } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkPaidButton from "./MarkPaidButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const client = await getClientById(id);
  if (!client) return <div className="p-8 text-gray-500">Client not found</div>;
  if (user.role !== "admin" && client.partnerId !== user.partnerId) redirect("/clients");

  const [[transactions, installments, orders], rate] = await Promise.all([
    Promise.all([
      getTransactionsByClient(id),
      getInstallmentsByClient(id),
      getOrders(user.partnerId),
    ]),
    loadRate(),
  ]);

  const clientOrders = orders.filter((o) => o.clientId === id);

  // Running balance
  let balance = 0;
  const txWithBalance = transactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((tx) => {
      if (tx.type === "purchase") balance += tx.amount;
      else if (tx.type === "payment") balance -= tx.amount;
      else if (tx.type === "refund") balance -= tx.amount;
      return { ...tx, balance };
    });

  const statusColor: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    upcoming: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
        <Badge variant="outline">{client.company}</Badge>
      </div>

      {/* Client info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{client.email}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{client.phone}</span></div>
            <div><span className="text-gray-500">Address:</span> <span className="font-medium">{client.address || "—"}</span></div>
            <div><span className="text-gray-500">Since:</span> <span className="font-medium">{new Date(client.createdAt).toLocaleDateString()}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Orders</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{clientOrders.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Purchased</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtBdt(transactions.filter((t) => t.type === "purchase").reduce((s, t) => s + t.amount, 0), rate, { compact: true })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Paid</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{fmtBdt(transactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0), rate, { compact: true })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Outstanding Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{fmtBdt(balance > 0 ? balance : 0, rate, { compact: true })}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="installments">Installments</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txWithBalance.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{tx.type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell className={`font-semibold ${tx.type === "payment" || tx.type === "refund" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "payment" || tx.type === "refund" ? "-" : "+"}{fmtBdt(tx.amount, tx.amountEur != null ? null : rate, { compact: true })}{tx.amountEur != null ? ` · €${tx.amountEur.toFixed(2)}` : ""}
                      </TableCell>
                      <TableCell className="font-semibold">{fmtBdt(tx.balance, rate, { compact: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installments">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead># / Total</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-mono text-xs">{inst.orderId}</TableCell>
                      <TableCell>{inst.installmentNumber} / {inst.totalInstallments}</TableCell>
                      <TableCell className="font-semibold">{fmtBdt(inst.amount, rate, { compact: true })}</TableCell>
                      <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{inst.paidDate ? new Date(inst.paidDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <Badge className={statusColor[inst.status] || ""}>{inst.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {inst.status !== "paid" && <MarkPaidButton installmentId={inst.id} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
