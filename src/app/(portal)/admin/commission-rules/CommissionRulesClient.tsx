"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommissionRule, PromoCodeType, CommissionTier } from "@/types";
import { DollarSign, Plus, Trash2, Pause, Play, Settings2, BarChart3, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createRuleAction, toggleRuleAction, deleteRuleAction } from "./actions";

export default function CommissionRulesClient({ rules }: { rules: CommissionRule[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [codeType, setCodeType] = useState<PromoCodeType>("referral-partner-individual");
  const [partnerTier, setPartnerTier] = useState<CommissionTier | "any">("any");
  const [productCategory, setProductCategory] = useState("all");
  const [percent, setPercent] = useState(10);
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(50000);
  const [priority, setPriority] = useState(10);

  async function handleCreate() {
    if (!name) return alert("Rule name is required");
    setLoading(true);
    try {
      await createRuleAction({
        name, codeType, partnerTier, productCategory,
        commissionPercent: percent, minOrderAmount: minAmount, maxCommission: maxAmount,
        priority
      });
      setShowCreate(false);
      setName("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleRuleAction(id, !current);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule?")) return;
    await deleteRuleAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-emerald" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Administration</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Commission <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Rules</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure payout logic for partners and referrers</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Define New Rule
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 text-emerald-700">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold">Rule Priority</p>
          <p className="text-emerald-700/80">Rules are evaluated from highest priority to lowest. The first rule that matches the partner tier and product category will be applied.</p>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl shadow-emerald-500/5 overflow-hidden relative">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-emerald-700">
            <Settings2 className="h-5 w-5" />
            New Commission Rule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Rule Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Individual Partner - All Products" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Code Type</label>
              <select value={codeType} onChange={(e) => setCodeType(e.target.value as any)} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm">
                <option value="promo-general">General Promo</option>
                <option value="referral-personal">Personal Referral</option>
                <option value="referral-partner-individual">Partner (Indiv)</option>
                <option value="referral-partner-institutional">Partner (Inst)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Partner Tier</label>
              <select value={partnerTier} onChange={(e) => setPartnerTier(e.target.value as any)} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm">
                <option value="any">Any Tier</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Product Category</label>
              <input value={productCategory} onChange={(e) => setProductCategory(e.target.value)} placeholder="all OR category name" className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Commission (%)</label>
              <input type="number" value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Max Payout (BDT)</label>
              <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(Number(e.target.value))} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Priority (0-99)</label>
              <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full px-4 py-2.5 bg-muted/50 border-0 rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-6">
            <button onClick={handleCreate} disabled={loading} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
              {loading ? "Saving..." : "Save Rule"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-8 py-3 bg-muted rounded-xl font-bold text-sm hover:bg-muted/80">Cancel</button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Priority</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Rule Name / Logic</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Tier / Category</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Commission</th>
                <th className="text-left px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                <th className="text-right px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">#{r.priority.toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{r.name}</span>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{r.codeType.replace(/-/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase">{r.partnerTier}</Badge>
                      <span className="text-[11px] text-muted-foreground">Cat: {r.productCategory}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-emerald-600 text-lg">{r.commissionPercent}%</span>
                      <span className="text-[10px] text-muted-foreground uppercase tabular-nums">Max: BDT {r.maxCommission.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={r.isActive ? "default" : "secondary"} className={r.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>
                      {r.isActive ? "ACTIVE" : "PAUSED"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggle(r.id, r.isActive)} className={`p-2 rounded-xl transition-all ${r.isActive ? "hover:bg-amber-500/10 text-amber-500" : "hover:bg-emerald-500/10 text-emerald-500"}`}>
                        {r.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-muted-foreground italic">No commission rules defined yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
