"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Award, Percent, Settings2, Loader2, Check } from "lucide-react";
import { updatePartnerTierAndMarginAction } from "./actions";
import type { TierStatus, PartnerMargin } from "@/types";

interface PartnerTierEditModalProps {
  partnerId: string;
  currentTier?: TierStatus;
  currentMargin?: PartnerMargin;
}

export default function PartnerTierEditModal({
  partnerId,
  currentTier = "Silver",
  currentMargin = 15,
}: PartnerTierEditModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<TierStatus>(currentTier);
  const [margin, setMargin] = useState<PartnerMargin>(currentMargin);

  async function handleSave() {
    setLoading(true);
    const res = await updatePartnerTierAndMarginAction(partnerId, tier, margin);
    if (res.success) {
      setOpen(false);
    } else {
      alert(res.error || "Failed to update partner level");
    }
    setLoading(false);
    router.refresh();
  }

  const tiers: { value: TierStatus; label: string; color: string; bg: string; border: string }[] = [
    { value: "Silver", label: "Silver Partner", color: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-500/30" },
    { value: "Gold", label: "Gold Partner", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { value: "Diamond", label: "Diamond Partner", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    { value: "Platinum", label: "Platinum Partner", color: "text-indigo-300", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  ];

  const margins: PartnerMargin[] = [8, 15, 20, 25];

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setTier(currentTier);
          setMargin(currentMargin);
          setOpen(true);
        }}
        className="text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 flex items-center gap-1.5 transition-all text-xs font-semibold py-1 px-2.5 h-8 rounded-xl"
        title="Edit Level & Margin"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Edit Level
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0c1024] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg mx-4 shadow-2xl relative animate-in zoom-in-95 duration-200 text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-none">Edit Status & Margin</h3>
                  <p className="text-xs text-white/50 mt-1">Retroactively change partner's parameters.</p>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="py-6 space-y-6">
              {/* Partner Status (Tier) */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-400" />
                  Partner Level / Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {tiers.map((t) => {
                    const isSelected = tier === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTier(t.value)}
                        className={`text-left p-3.5 rounded-2xl border text-sm font-semibold transition-all relative overflow-hidden group ${
                          isSelected 
                            ? `${t.border} ${t.bg} shadow-lg ring-1 ring-white/10 scale-[1.01]` 
                            : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className={`block transition-all ${t.color} ${isSelected ? "translate-x-1" : ""}`}>
                          {isSelected ? "👑 " : ""}{t.label}
                        </span>
                        <span className="block text-[10px] text-white/40 mt-1 font-normal">
                          {t.value === "Silver" && "Standard commission base"}
                          {t.value === "Gold" && "High volume individual"}
                          {t.value === "Diamond" && "Elite institutional partner"}
                          {t.value === "Platinum" && "Top-tier premium consultant"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commission Margin */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-400" />
                  Partner Share Margin
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {margins.map((m) => {
                    const isSelected = margin === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMargin(m)}
                        className={`py-3 rounded-2xl border text-sm font-bold transition-all ${
                          isSelected 
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-md scale-[1.03]" 
                            : "border-white/5 bg-white/[0.01] hover:border-white/10 text-white/60 hover:text-white"
                        }`}
                      >
                        {m}%
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white hover:bg-white/5 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 rounded-2xl shadow-lg hover:shadow-indigo-500/20 scale-[1.02] active:scale-100 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
