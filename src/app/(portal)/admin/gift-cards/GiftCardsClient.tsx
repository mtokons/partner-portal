"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SccgCard } from "@/types";
import { CreditCard, Plus, Trash2, ShieldAlert, CheckCircle2, Copy, Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { issueGiftCardAction, freezeGiftCardAction, activateGiftCardAction } from "./actions";

export default function GiftCardsClient({ giftCards }: { giftCards: SccgCard[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [toUserId, setToUserId] = useState("");
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [balance, setBalance] = useState(5000);
  const [template, setTemplate] = useState<"standard" | "premium" | "birthday" | "corporate">("standard");
  const [expiry, setExpiry] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  async function handleCreate() {
    if (!toName || !toEmail) return alert("Please fill name and email");
    setLoading(true);
    try {
      await issueGiftCardAction({
        issuedToUserId: toUserId || "manual_" + Date.now(),
        issuedToName: toName,
        issuedToEmail: toEmail,
        initialBalance: balance,
        designTemplate: template,
        expiresAt: expiry,
      });
      setShowCreate(false);
      setToUserId("");
      setToName("");
      setToEmail("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    try {
      if (currentStatus === "active") {
        await freezeGiftCardAction(id);
      } else {
        await activateGiftCardAction(id);
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error toggle status");
    }
  }

  function copyNumber(num: string, id: string) {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filteredCards = giftCards.filter(c => 
    c.cardNumber.includes(search) || 
    c.issuedToName.toLowerCase().includes(search.toLowerCase()) ||
    c.issuedToEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-purple" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Administration</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Gift <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">Cards</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and issue SCCG store credit</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Issue New Card
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl shadow-purple-500/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-500" />
            Issue Gift Card
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Recipient Name</label>
              <input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Recipient Email</label>
              <input value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="email@example.com" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Balance (BDT)</label>
              <input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Design Template</label>
              <select value={template} onChange={(e) => setTemplate(e.target.value as any)} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20">
                <option value="standard">Standard Blue</option>
                <option value="premium">Premium Gold</option>
                <option value="birthday">Birthday Special</option>
                <option value="corporate">Corporate Identity</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Expiry Date</label>
              <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">User ID (Optional)</label>
              <input value={toUserId} onChange={(e) => setToUserId(e.target.value)} placeholder="cust_xxx" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20" />
            </div>
          </div>
          <div className="flex gap-3 pt-6">
            <button onClick={handleCreate} disabled={loading} className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-500/20">
              {loading ? "Issuing..." : "Confirm & Issue Card"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-8 py-3 bg-muted rounded-xl font-bold text-sm hover:bg-muted/80">Cancel</button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Active", value: giftCards.filter(c => c.status === "active").length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Total Frozen", value: giftCards.filter(c => c.status === "frozen").length, icon: ShieldAlert, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Depleted", value: giftCards.filter(c => c.status === "depleted").length, icon: CreditCard, color: "text-slate-500", bg: "bg-slate-500/10" },
          { label: "Total Issued", value: giftCards.length, icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-black tabular-nums">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or card number..." 
            className="bg-transparent border-0 focus:ring-0 text-sm w-full placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Card Number</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Recipient</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Balance</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Expiry</th>
                <th className="text-right px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredCards.map((c) => (
                <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${c.status === "active" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted"}`} />
                      <span className="font-mono font-bold text-foreground/80">{c.cardNumber}</span>
                      <button onClick={() => copyNumber(c.cardNumber, c.id)} className="p-1 hover:text-purple-500 transition-colors">
                        {copiedId === c.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{c.issuedToName}</span>
                      <span className="text-[11px] text-muted-foreground">{c.issuedToEmail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-purple-600">BDT {c.currentBalance.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground italic">of BDT {c.initialBalance.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={c.status === "active" ? "default" : c.status === "frozen" ? "destructive" : "secondary"}>
                      {c.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">
                    {new Date(c.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                       {c.status !== "depleted" && (
                         <button 
                           onClick={() => handleToggleStatus(c.id, c.status)}
                           className={`p-2 rounded-xl transition-all ${c.status === "active" ? "hover:bg-amber-500/10 text-amber-500" : "hover:bg-emerald-500/10 text-emerald-500"}`}
                           title={c.status === "active" ? "Freeze Card" : "Activate Card"}
                         >
                           {c.status === "active" ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCards.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-muted-foreground italic">No gift cards found matching your criteria</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
