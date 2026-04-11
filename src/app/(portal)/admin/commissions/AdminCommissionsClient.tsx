"use client";

import { useState } from "react";
import type { CommissionLedgerEntry } from "@/types";
import { FileText, Search, ArrowUpRight, ArrowDownLeft, AlertCircle, Plus, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adjustCommissionAction } from "./actions";
import { useRouter } from "next/navigation";

export default function AdminCommissionsClient({ entries }: { entries: CommissionLedgerEntry[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [loading, setLoading] = useState(false);

  // Adjustment form
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [targetType, setTargetType] = useState("partner");
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");

  async function handleAdjust() {
    if (!targetId || !amount || !desc) return alert("Please fill all fields");
    setLoading(true);
    try {
      await adjustCommissionAction({
        recipientId: targetId,
        recipientName: targetName,
        recipientType: targetType,
        amount,
        description: desc
      });
      setShowAdjust(false);
      setTargetId("");
      setAmount(0);
      setDesc("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = entries.filter(e => 
    e.recipientName.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.orderNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-blue" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Administration</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Commission <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">Ledger</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Global transaction log of all partner earnings</p>
        </div>
        <button
          onClick={() => setShowAdjust(!showAdjust)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Manual Adjustment
        </button>
      </div>

      {/* Adjustment Form */}
      {showAdjust && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl shadow-blue-500/5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-700">
             <AlertCircle className="h-5 w-5" />
             Manual Commission Adjustment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Recipient Name</label>
              <input value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="e.g. Alice Weber" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Recipient ID</label>
              <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="e.g. p1" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm" />
            </div>
             <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Recipient Type</label>
              <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm">
                <option value="partner">Partner</option>
                <option value="expert">Expert</option>
                <option value="referrer">Referrer (Public)</option>
              </select>
            </div>
            <div className="space-y-1.5 text-blue-600">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Amount (Use Negative for deduction)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full px-4 py-2.5 bg-blue-500/5 border-blue-500/20 border rounded-xl text-sm font-black" />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Adjustment Reason / Notes</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Correction for order #ORD-XX" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-6">
            <button onClick={handleAdjust} disabled={loading} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {loading ? "Processing..." : "Confirm Adjustment"}
            </button>
            <button onClick={() => setShowAdjust(false)} className="px-8 py-3 bg-muted rounded-xl font-bold text-sm hover:bg-muted/80">Cancel</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient, order number, or description..." 
            className="bg-transparent border-0 focus:ring-0 text-sm w-full placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Date / Time</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Recipient</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Type / Order</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Description</th>
                <th className="text-right px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{new Date(e.createdAt).toLocaleDateString()}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground uppercase tracking-tight">{e.recipientName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{e.recipientId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[9px] font-bold uppercase py-0">{e.entryType.replace('commission-', '')}</Badge>
                        {e.orderNumber && <span className="text-xs font-mono font-bold text-blue-600">{e.orderNumber}</span>}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-muted-foreground max-w-sm line-clamp-2">{e.description}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1.5 font-black text-base tabular-nums ${e.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                       <span className="text-xs font-bold">{e.amount >= 0 ? "+" : "-"}</span>
                       <span>BDT {Math.abs(e.amount).toLocaleString()}</span>
                       {e.amount >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic tracking-wide">No ledger entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
