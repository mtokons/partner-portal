"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Target, X, Loader2, Check } from "lucide-react";
import { updatePartnerSalesTargetAction } from "./actions";

interface Props {
  partnerId: string;
  currentTarget?: number;
}

export default function SalesTargetModal({ partnerId, currentTarget = 0 }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(String(currentTarget));

  async function handleSave() {
    const val = parseInt(target, 10);
    if (isNaN(val) || val < 0) return;
    setLoading(true);
    const res = await updatePartnerSalesTargetAction(partnerId, val);
    if (res.success) {
      setOpen(false);
    } else {
      alert(res.error || "Failed to update sales target");
    }
    setLoading(false);
    router.refresh();
  }

  const presets = [25000, 50000, 100000, 150000, 200000, 500000];

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setTarget(String(currentTarget)); setOpen(true); }}
        className="text-amber-400 border-amber-500/20 hover:bg-amber-500/10 flex items-center gap-1.5 transition-all text-xs font-semibold py-1 px-2.5 h-8 rounded-xl"
        title="Set Sales Target"
      >
        <Target className="h-3.5 w-3.5" />
        {currentTarget ? `€${(currentTarget / 1000).toFixed(0)}k` : "Set Target"}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 w-full max-w-md mx-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-none">Set Sales Target</h3>
                  <p className="text-xs text-muted-foreground mt-1">Annual sales target for this partner.</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input */}
            <div className="py-6 space-y-4">
              <label className="block text-sm font-bold text-foreground">
                Target Amount (EUR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
                <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  min="0"
                  step="1000"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border bg-background text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="100000"
                />
              </div>
              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setTarget(String(p))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      target === String(p)
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    €{(p / 1000).toFixed(0)}k
                  </button>
                ))}
                <button
                  onClick={() => setTarget("0")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    target === "0"
                      ? "bg-muted text-foreground border-border"
                      : "bg-muted text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  No Target
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Save Target
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
