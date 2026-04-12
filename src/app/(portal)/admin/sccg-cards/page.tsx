import { fetchCards } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CreditCard, Plus, DollarSign, Users, AlertTriangle } from "lucide-react";

export default async function SccgCardsPage() {
  const cards = await fetchCards();

  const activeCards = cards.filter((c) => c.status === "active");
  const totalBalance = cards.reduce((s, c) => s + c.balance, 0);
  const frozenCards = cards.filter((c) => c.status === "frozen");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SCCG Cards</h1>
          <p className="text-muted-foreground">{cards.length} cards issued</p>
        </div>
        <Link href="/admin/sccg-cards/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
          <Plus className="h-4 w-4" /> Issue Card
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CreditCard className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{cards.length}</p>
            <p className="text-xs text-muted-foreground">Total Cards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{activeCards.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-violet-500 mb-1" />
            <p className="text-2xl font-bold">৳{(totalBalance / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total Balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold">{frozenCards.length}</p>
            <p className="text-xs text-muted-foreground">Frozen</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Card Number</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Balance</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Issued</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No SCCG Cards issued yet
                </td></tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <Link href={`/admin/sccg-cards/${c.id}`} className="text-primary hover:underline font-mono text-xs">
                        •••• {c.cardNumber.slice(-4)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium">{c.clientName}</td>
                    <td className="py-3 px-4">
                      <Badge variant={c.tier === "platinum" ? "default" : c.tier === "premium" ? "outline" : "secondary"}
                        className="capitalize text-xs">{c.tier}</Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {c.currency === "EUR" ? "€" : "৳"}{c.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{c.issuedAt?.split("T")[0]}</td>
                    <td className="py-3 px-4">
                      <Badge variant={c.status === "active" ? "default" : c.status === "frozen" ? "destructive" : "secondary"}
                        className="capitalize text-xs">{c.status}</Badge>
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
