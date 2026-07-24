"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CoinWallet, Partner } from "@/types";
import { Wallet, Plus, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { rechargeWalletAction } from "./actions";

export default function WalletsClient({ wallets, users }: { wallets: CoinWallet[]; users: { id: string; name: string; email: string; role: string }[] }) {
  const router = useRouter();
  const [rechargeTarget, setRechargeTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState(1000);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRecharge() {
    if (!rechargeTarget) return;
    const wallet = wallets.find((w) => w.userId === rechargeTarget);
    const user = users.find((u) => u.id === rechargeTarget);
    setLoading(true);
    try {
      await rechargeWalletAction(rechargeTarget, wallet?.userName || user?.name || "User", amount, description);
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
        <button
          onClick={() => setRechargeTarget("new")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/25 transition-all"
        >
          <Plus className="h-4 w-4" />
          Top Up User
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Wallets</p>
          <p className="text-2xl font-black mt-1">{(wallets || []).length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Balance</p>
          <p className="text-2xl font-black mt-1 text-emerald-600">
            {(wallets || []).reduce((s, w) => s + (Number(w?.balance) || 0), 0).toLocaleString()} 
            <span className="text-sm font-medium text-muted-foreground ml-1">coins</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Earned</p>
          <p className="text-2xl font-black mt-1">
            {(wallets || []).reduce((s, w) => s + (Number(w?.totalEarned) || 0), 0).toLocaleString()} 
            <span className="text-sm font-medium text-muted-foreground ml-1">coins</span>
          </p>
        </div>
      </div>

      {/* Recharge modal */}
      {rechargeTarget && (
        <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> Recharge Wallet</h3>
          
          {rechargeTarget === "new" ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Select User</label>
              <select 
                onChange={(e) => setRechargeTarget(e.target.value)} 
                defaultValue=""
                className="w-full px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="" disabled>Select a user to top up...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email}) - {u.role}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              User: <span className="font-semibold text-foreground">
                {wallets.find((w) => w.userId === rechargeTarget)?.userName || users.find((u) => u.id === rechargeTarget)?.name || rechargeTarget}
              </span>
            </p>
          )}

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
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleRecharge} 
              disabled={loading || amount <= 0 || rechargeTarget === "new"} 
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
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
              {(wallets || []).map((w) => (
                <tr key={w.id || Math.random().toString()} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{w.userName || "Unknown User"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{(Number(w.balance) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{(Number(w.totalEarned) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{(Number(w.totalSpent) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={w.status === "active" ? "default" : "secondary"}>{w.status || "active"}</Badge></td>
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
