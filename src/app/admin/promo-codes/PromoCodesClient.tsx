"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PromoCode, PromoCodeType } from "@/types";
import { Tag, Plus, Trash2, Pause, Play, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPromoCodeAction, deletePromoCodeAction, togglePromoCodeAction } from "./actions";

const TYPE_LABELS: Record<PromoCodeType, string> = {
  "promo-general": "General Promo",
  "referral-personal": "Personal Referral",
  "referral-partner-individual": "Individual Partner",
  "referral-partner-institutional": "Institutional Partner",
};

export default function PromoCodesClient({ promoCodes }: { promoCodes: PromoCode[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [codeType, setCodeType] = useState<PromoCodeType>("promo-general");
  const [discountType, setDiscountType] = useState<"fixed" | "percent" | "none">("percent");
  const [discountValue, setDiscountValue] = useState(10);
  const [maxUses, setMaxUses] = useState(100);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(1);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [validUntil, setValidUntil] = useState("");

  async function handleCreate() {
    setLoading(true);
    try {
      await createPromoCodeAction({
        code: code || undefined,
        codeType,
        discountType,
        discountValue,
        maxUses,
        maxUsesPerUser,
        minOrderAmount,
        validFrom: new Date().toISOString().slice(0, 10),
        validUntil: validUntil || undefined,
      });
      setShowCreate(false);
      setCode("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promo code?")) return;
    await deletePromoCodeAction(id);
    router.refresh();
  }

  async function handleToggle(id: string, current: string) {
    const newStatus = current === "active" ? "paused" : "active";
    await togglePromoCodeAction(id, newStatus as PromoCode["status"]);
    router.refresh();
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            Promo <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Codes</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{promoCodes.length} promo codes total</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-primary/25"
        >
          <Plus className="h-4 w-4" />
          Create Code
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg">New Promo Code</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Code (auto if empty)</label>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SCCG-XXXX" className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Type</label>
              <select value={codeType} onChange={(e) => setCodeType(e.target.value as PromoCodeType)} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Discount Type</label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "fixed" | "percent" | "none")} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="percent">Percent</option>
                <option value="fixed">Fixed (BDT)</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Discount Value</label>
              <input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Max Uses (0=unlimited)</label>
              <input type="number" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Max Uses Per User</label>
              <input type="number" value={maxUsesPerUser} onChange={(e) => setMaxUsesPerUser(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Min Order (BDT)</label>
              <input type="number" value={minOrderAmount} onChange={(e) => setMinOrderAmount(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Valid Until</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} disabled={loading} className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50">
              {loading ? "Creating..." : "Create Promo Code"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-6 py-2.5 bg-muted rounded-xl font-semibold text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Discount</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Uses</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Owner</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {promoCodes.map((pc) => (
                <tr key={pc.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-mono font-bold">{pc.code}</span>
                      <button onClick={() => copyCode(pc.code, pc.id)} className="text-muted-foreground hover:text-primary">
                        {copiedId === pc.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[pc.codeType]}</td>
                  <td className="px-4 py-3">
                    {pc.discountType === "percent" ? `${pc.discountValue}%` : pc.discountType === "fixed" ? `BDT ${pc.discountValue.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">{pc.currentUses}{pc.maxUses > 0 ? ` / ${pc.maxUses}` : " / ∞"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={pc.status === "active" ? "default" : "secondary"}>{pc.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{pc.ownerName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggle(pc.id, pc.status)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center" title={pc.status === "active" ? "Pause" : "Activate"}>
                        {pc.status === "active" ? <Pause className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
                      </button>
                      <button onClick={() => handleDelete(pc.id)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center" title="Delete">
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {promoCodes.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No promo codes yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
