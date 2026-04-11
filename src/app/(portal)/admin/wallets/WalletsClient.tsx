"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CoinWallet, Partner } from "@/types";
import { Wallet, Plus, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { rechargeWalletAction } from "./actions";

export default function WalletsClient({ wallets, partners }: { wallets: CoinWallet[]; partners: Partner[] }) {
  const router = useRouter();
  const [rechargeTarget, setRechargeTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState(1000);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRecharge() {
    if (!rechargeTarget) return;
    const wallet = wallets.find((w) => w.userId === rechargeTarget);
    const partner = partners.find((p) => p.id === rechargeTarget);
    setLoading(true);
    try {
      await rechargeWalletAction(rechargeTarget, wallet?.userName || partner?.name || "User", amount, description);
      setRechargeTarget(null);
      setAmount(1000);
      setDescription("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-blue" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Administration</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            SCCG <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Wallets</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{wallets.length} wallets · Manage balances & recharge coins</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Wallets</p>
          <p className="text-2xl font-black mt-1">{wallets.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Balance</p>
          <p className="text-2xl font-black mt-1 text-emerald-600">{wallets.reduce((s, w) => s + w.balance, 0).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">coins</span></p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Earned</p>
          <p className="text-2xl font-black mt-1">{wallets.reduce((s, w) => s + w.totalEarned, 0).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">coins</span></p>
        </div>
      </div>

      {/* Recharge modal */}
      {rechargeTarget && (
        <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> Recharge Wallet</h3>
          <p className="text-sm text-muted-foreground">User: <span className="font-semibold text-foreground">{wallets.find((w) => w.userId === rechargeTarget)?.userName || rechargeTarget}</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Amount (coins)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={1} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Admin top-up" className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRecharge} disabled={loading || amount <= 0} className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50">
              {loading ? "Recharging..." : `Add ${amount.toLocaleString()} Coins`}
            </button>
            <button onClick={() => setRechargeTarget(null)} className="px-6 py-2.5 bg-muted rounded-xl font-semibold text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">User</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Balance</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Earned</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Spent</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {wallets.map((w) => (
                <tr key={w.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{w.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{w.balance.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{w.totalEarned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{w.totalSpent.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={w.status === "active" ? "default" : "secondary"}>{w.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setRechargeTarget(w.userId)} className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20">
                      <Plus className="h-3.5 w-3.5" /> Recharge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
