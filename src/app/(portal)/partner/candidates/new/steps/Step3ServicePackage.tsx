"use client";

import { useEffect, useState } from "react";
import { getServicePricingByCategory } from "@/lib/data/service-pricing";
import type { WorkflowCategory, ServicePricing } from "@/types";
import type { SelectedService } from "../WizardShell";

interface Step3ServicePackageProps {
  workflowCategory: WorkflowCategory;
  selectedServices: SelectedService[];
  onNext: (services: SelectedService[]) => void;
  onBack: () => void;
}

const TAB_LABELS: { key: string; label: string }[] = [
  { key: "all-inclusive", label: "All-Inclusive" },
  { key: "premium-bundle", label: "Premium Bundles" },
  { key: "add-on", label: "Add-ons" },
];

export function Step3ServicePackage({
  workflowCategory,
  selectedServices: initial,
  onNext,
  onBack,
}: Step3ServicePackageProps) {
  const [tab, setTab] = useState("all-inclusive");
  const [selected, setSelected] = useState<Map<string, SelectedService>>(
    new Map(initial.map((s) => [s.servicePricingId, s]))
  );
  const pricing = getServicePricingByCategory(workflowCategory);
  const filtered = pricing.filter((p) => p.packageType === tab);

  function toggle(p: ServicePricing) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.set(p.id, {
          servicePricingId: p.id,
          serviceName: p.serviceName,
          packageType: p.packageType,
          basePrice: p.basePrice,
          quantity: 1,
        });
      }
      return next;
    });
  }

  const subtotal = Array.from(selected.values()).reduce(
    (s, sv) => s + sv.basePrice * sv.quantity,
    0
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Select Service Package</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose services for {workflowCategory}.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TAB_LABELS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Services list */}
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No services in this category.
          </p>
        )}
        {filtered.map((p) => {
          const isSelected = selected.has(p.id);
          return (
            <label
              key={p.id}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(p)}
                className="mt-0.5 accent-primary"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{p.serviceName}</p>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                )}
              </div>
              <span className="text-sm font-bold shrink-0">
                €{p.basePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </label>
          );
        })}
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm text-muted-foreground">
          {selected.size} service{selected.size !== 1 ? "s" : ""} selected
        </span>
        <span className="font-bold text-foreground">
          Subtotal: €{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(Array.from(selected.values()))}
          disabled={selected.size === 0}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
