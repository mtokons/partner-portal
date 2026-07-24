"use client";

import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { WorkflowCategory, Product } from "@/types";
import type { SelectedService } from "../WizardShell";

interface Step3ServicePackageProps {
  workflowCategory: WorkflowCategory;
  selectedServices: SelectedService[];
  products: Product[];
  onNext: (services: SelectedService[], category: WorkflowCategory) => void;
  onBack: () => void;
  secondaryCurrency?: string;
  exchangeRate?: number;
}

const CSYM: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", TRY: "₺",
};

const ALL_CATEGORIES: WorkflowCategory[] = [
  "Training & Language",
  "Ausbildung",
  "Student",
  "Opportunity Card",
  "Others",
];

export function Step3ServicePackage({
  workflowCategory: initialCategory,
  selectedServices: initial,
  products,
  onNext,
  onBack,
  secondaryCurrency = "EUR",
  exchangeRate = 1,
}: Step3ServicePackageProps) {
  const [category, setCategory] = useState<WorkflowCategory>(initialCategory);
  const [selected, setSelected] = useState<Map<string, SelectedService>>(
    new Map(initial.map((s) => [s.servicePricingId, s]))
  );

  // Derive available categories from products
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(products.flatMap((p) => p.category).filter(Boolean)));
    return cats.length > 0
      ? ALL_CATEGORIES.filter((c) => cats.includes(c))
      : ALL_CATEGORIES;
  }, [products]);

  // Filter products by selected category only (no sub-category tabs)
  const filtered = useMemo(() => {
    return products.filter(
      (p) => p.category?.includes(category) && p.isAvailable
    );
  }, [products, category]);

  function toggle(p: Product) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.set(p.id, {
          servicePricingId: p.id,
          serviceName: p.name,
          packageType: (p.tags?.find((t) =>
            ["all-inclusive", "premium-bundle", "add-on"].includes(t.toLowerCase().replace(/\s/g, "-"))
          ) as SelectedService["packageType"]) || "all-inclusive",
          basePrice: p.price,
          quantity: 1,
          initialPaymentAmount: p.initialPayment,
          workflowCategory: p.category || category,
        });
      }
      return next;
    });
  }

  function updateQty(id: string, qty: number) {
    if (qty < 1) return;
    setSelected((prev) => {
      const next = new Map(prev);
      const item = next.get(id);
      if (item) next.set(id, { ...item, quantity: qty });
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
  const showSec = secondaryCurrency !== "EUR" && exchangeRate > 1;
  const secSym = CSYM[secondaryCurrency] || secondaryCurrency;
  const fmtSec = (eur: number) => `${secSym}${Math.round(eur * exchangeRate).toLocaleString()}`;

  function handleNext() {
    onNext(selectedArray, category);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Select Services</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a workflow category, then select the services you need.
          {showSec && <span className="ml-1">All prices are in EUR.</span>}
        </p>
      </div>

      {/* Workflow Category Selector */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Workflow Category <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                // Clear selected services when category changes
                setSelected(new Map());
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                category === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-muted-foreground/20 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Col: Products */}
        <div className="flex-1 space-y-4">
          {/* Services list — all products for this category */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {filtered.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed rounded-xl border-muted">
                <p className="text-sm text-muted-foreground">No services available for {category}.</p>
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
                    {showSec && (
                      <span className="block text-[10px] font-normal text-muted-foreground">≈ {fmtSec(p.price)}</span>
                    )}
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
                selectedArray.map((item) => (
                  <div key={item.servicePricingId} className="flex gap-3 justify-between items-start text-sm group">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" title={item.serviceName}>{item.serviceName}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        €{item.basePrice.toLocaleString()}
                      </p>
                      {/* Quantity control */}
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => updateQty(item.servicePricingId, item.quantity - 1)}
                          className="w-5 h-5 rounded text-xs border flex items-center justify-center hover:bg-muted disabled:opacity-30"
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.servicePricingId, item.quantity + 1)}
                          className="w-5 h-5 rounded text-xs border flex items-center justify-center hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
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
                  {showSec && (
                    <span className="block text-xs font-normal text-muted-foreground">≈ {fmtSec(subtotal)}</span>
                  )}
                </span>
              </div>
              <button
                onClick={handleNext}
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
