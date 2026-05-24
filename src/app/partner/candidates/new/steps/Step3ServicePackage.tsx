"use client";

import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { WorkflowCategory, Product } from "@/types";
import type { SelectedService } from "../WizardShell";

interface Step3ServicePackageProps {
  workflowCategory: WorkflowCategory;
  selectedServices: SelectedService[];
  products: Product[];
  onNext: (services: SelectedService[]) => void;
  onBack: () => void;
}

const TAB_LABELS = [
  { key: "all-inclusive", label: "All-Inclusive", match: ["All-Inclusive", "all-inclusive"] },
  { key: "premium-bundle", label: "Premium Bundles", match: ["Premium Bundles", "premium-bundle", "Premium Bundle"] },
  { key: "add-on", label: "Add-ons", match: ["Add-ons", "add-on", "Add-on"] },
];

export function Step3ServicePackage({
  workflowCategory,
  selectedServices: initial,
  products,
  onNext,
  onBack,
}: Step3ServicePackageProps) {
  const [tab, setTab] = useState("all-inclusive");
  const [selected, setSelected] = useState<Map<string, SelectedService>>(
    new Map(initial.map((s) => [s.servicePricingId, s]))
  );

  const categoryProducts = useMemo(() => {
    return products.filter((p) => p.category?.includes(workflowCategory) && p.isAvailable);
  }, [products, workflowCategory]);

  const filtered = useMemo(() => {
    const activeTab = TAB_LABELS.find(t => t.key === tab);
    if (!activeTab) return [];
    return categoryProducts.filter(p => 
      p.tags?.some(tag => activeTab.match.includes(tag))
    );
  }, [categoryProducts, tab]);

  function toggle(p: Product) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.set(p.id, {
          servicePricingId: p.id,
          serviceName: p.name,
          packageType: tab as any,
          basePrice: p.price,
          quantity: 1,
        });
      }
      return next;
    });
  }

  function remove(id: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  const selectedArray = Array.from(selected.values());
  const subtotal = selectedArray.reduce((s, sv) => s + sv.basePrice * sv.quantity, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Select Service Package</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose services for {workflowCategory}.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Col: Products */}
        <div className="flex-1 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b overflow-x-auto pb-px">
            {TAB_LABELS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Services list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {filtered.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed rounded-xl border-muted">
                <p className="text-sm text-muted-foreground">No services found for this tab.</p>
              </div>
            )}
            {filtered.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(p)}
                    className="mt-1 w-4 h-4 accent-primary rounded border-muted-foreground/30"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold shrink-0 text-primary">
                    €{p.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Right Col: Floating Cart */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="sticky top-6 bg-card border rounded-2xl p-5 shadow-sm flex flex-col h-[calc(100vh-12rem)] max-h-[500px]">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {selectedArray.length}
              </span>
              Selected Items
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {selectedArray.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Your cart is empty.</p>
              ) : (
                selectedArray.map(item => (
                  <div key={item.servicePricingId} className="flex gap-3 justify-between items-start text-sm group">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" title={item.serviceName}>{item.serviceName}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">€{item.basePrice.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => remove(item.servicePricingId)}
                      className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-dashed">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground font-medium">Subtotal</span>
                <span className="text-lg font-bold text-foreground">
                  €{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={() => onNext(selectedArray)}
                disabled={selectedArray.length === 0}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Continue to Split →
              </button>
              <button
                onClick={onBack}
                className="w-full mt-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
