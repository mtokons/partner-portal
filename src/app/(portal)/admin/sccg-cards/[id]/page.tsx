"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchCardById, fetchCardTransactions, loadCard, redeemCard, suspendCard, reactivateCard } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, CreditCard, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import type { SccgCard, SccgCardTransaction } from "@/types";

export default function SccgCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [cardId, setCardId] = useState<string | null>(null);
  const [card, setCard] = useState<SccgCard | null>(null);
  const [transactions, setTransactions] = useState<SccgCardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDesc, setTxnDesc] = useState("");
  const [txnType, setTxnType] = useState<"load" | "redeem">("load");

  useEffect(() => { params.then(({ id }) => setCardId(id)); }, [params]);

  const load = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      const [c, txns] = await Promise.all([fetchCardById(cardId), fetchCardTransactions(cardId)]);
      setCard(c);
      setTransactions(txns);
    } finally { setLoading(false); }
  }, [cardId]);

  useEffect(() => { load(); }, [load]);

  async function handleTransaction() {
    if (!cardId || !txnAmount || !txnDesc) return;
    setActionLoading(true);
    try {
      if (txnType === "load") {
        await loadCard(cardId, parseFloat(txnAmount), txnDesc);
      } else {
        await redeemCard(cardId, parseFloat(txnAmount), txnDesc);
      }
      setTxnAmount("");
      setTxnDesc("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Transaction failed");
    } finally { setActionLoading(false); }
  }

  async function handleSuspend() {
    if (!cardId) return;
    setActionLoading(true);
    try {
      await suspendCard(cardId, "Admin action");
      await load();
    } finally { setActionLoading(false); }
  }

  async function handleReactivate() {
    if (!cardId) return;
    setActionLoading(true);
    try {
      await reactivateCard(cardId);
      await load();
    } finally { setActionLoading(false); }
  }

  if (loading || !card) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  const currencySymbol = card.currency === "EUR" ? "€" : "৳";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/sccg-cards" className="p-2 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">SCCG Card</h1>
          <p className="text-sm text-muted-foreground font-mono">•••• •••• •••• {card.cardNumber.slice(-4)}</p>
        </div>
        <Badge variant={card.status === "active" ? "default" : "destructive"} className="capitalize">{card.status}</Badge>
      </div>

      {/* Card Visual */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{
        background: card.tier === "platinum" ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
          : card.tier === "premium" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          : "linear-gradient(135deg, #2d3436 0%, #636e72 100%)",
      }}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wider">SCCG Card</p>
            <p className="text-sm font-bold uppercase">{card.tier}</p>
          </div>
          <CreditCard className="h-8 w-8 opacity-70" />
        </div>
        <p className="text-lg font-mono tracking-widest mb-4">
          {card.cardNumber.replace(/(.{4})/g, "$1 ").trim()}
        </p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs opacity-70">Card Holder</p>
            <p className="font-medium">{card.clientName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Balance</p>
            <p className="text-2xl font-bold">{currencySymbol}{card.balance.toLocaleString()}</p>
          </div>
        </div>
        {card.sccgId && <p className="mt-2 text-xs opacity-50 font-mono">{card.sccgId}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Info */}
        <Card>
          <CardHeader><CardTitle>Card Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">SCCG ID</span><span className="font-mono">{card.sccgId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-medium">{card.clientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{card.clientEmail}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><span className="capitalize font-medium">{card.tier}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{card.issuedAt?.split("T")[0]}</span></div>
            {card.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">Notes:</span> {card.notes}</div>}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader><CardTitle>Transaction</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setTxnType("load")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${txnType === "load" ? "bg-green-50 border-green-300 text-green-700" : "hover:bg-muted"}`}>
                Load
              </button>
              <button onClick={() => setTxnType("redeem")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${txnType === "redeem" ? "bg-red-50 border-red-300 text-red-700" : "hover:bg-muted"}`}>
                Redeem
              </button>
            </div>
            <Input type="number" placeholder="Amount" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} min={0} />
            <Input placeholder="Description" value={txnDesc} onChange={(e) => setTxnDesc(e.target.value)} />
            <button onClick={handleTransaction} disabled={actionLoading || !txnAmount || !txnDesc || card.status !== "active"}
              className={`w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${txnType === "load" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
              {actionLoading ? "Processing..." : txnType === "load" ? "Load Funds" : "Redeem Funds"}
            </button>
            <div className="pt-2 border-t flex gap-2">
              {card.status === "active" && (
                <button onClick={handleSuspend} disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-yellow-600 text-white text-xs font-medium hover:bg-yellow-700 disabled:opacity-50">
                  Suspend Card
                </button>
              )}
              {card.status === "frozen" && (
                <button onClick={handleReactivate} disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                  Reactivate Card
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader><CardTitle>Transaction History ({transactions.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Type</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Balance After</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No transactions yet</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-2 px-4 text-xs">{t.performedAt?.split("T")[0]}</td>
                    <td className="py-2 px-4">
                      <span className="flex items-center gap-1">
                        {t.type === "load" ? <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" /> : <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span className="capitalize text-xs">{t.type}</span>
                      </span>
                    </td>
                    <td className={`py-2 px-4 font-medium ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.amount >= 0 ? "+" : ""}{currencySymbol}{Math.abs(t.amount).toLocaleString()}
                    </td>
                    <td className="py-2 px-4">{currencySymbol}{t.balanceAfter.toLocaleString()}</td>
                    <td className="py-2 px-4 text-muted-foreground">{t.description}</td>
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
