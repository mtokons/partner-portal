"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  X, Search, Plus, ShoppingBag, 
  Check, Loader2, ArrowRight, DollarSign 
} from "lucide-react";
import { buyAdditionalServicesAction } from "../actions";
import type { Product, PartnerMargin } from "@/types";

interface BuyServiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  candidateSccgId: string;
  candidateMargin: PartnerMargin;
  products: Product[];
}

export default function BuyServiceDrawer({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  candidateSccgId,
  candidateMargin,
  products
}: BuyServiceDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | "">("");
  const [isPending, startTransition] = useTransition();

  // Categories
  const [activeTab, setActiveTab] = useState<"all" | "all-inclusive" | "premium" | "add-on">("all");

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.isAvailable !== false);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description || "").toLowerCase().includes(q)
      );
    }

    if (activeTab === "all-inclusive") {
      list = list.filter(p => p.sku.startsWith("ALL") || (p.tags && p.tags.includes("all-inclusive")));
    } else if (activeTab === "premium") {
      list = list.filter(p => p.sku.startsWith("PREM") || (p.tags && p.tags.includes("premium-bundle")));
    } else if (activeTab === "add-on") {
      list = list.filter(p => !p.sku.startsWith("ALL") && !p.sku.startsWith("PREM"));
    }

    return list;
  }, [products, searchQuery, activeTab]);

  const defaultPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.retailPriceEur || selectedProduct.price || 0;
  }, [selectedProduct]);

  const finalPrice = customPrice !== "" ? Number(customPrice) : defaultPrice;
  const marginPercentage = Number(candidateMargin || 0);
  const candidateTotal = finalPrice * quantity;

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setCustomPrice(prod.retailPriceEur || prod.price || 0);
    setQuantity(1);
  };

  const handleCheckout = () => {
    if (!selectedProduct) return;

    startTransition(async () => {
      const servicePayload = [{
        servicePricingId: selectedProduct.id,
        serviceName: selectedProduct.name,
        packageType: (selectedProduct.sku.startsWith("ALL") 
          ? "all-inclusive" 
          : selectedProduct.sku.startsWith("PREM") 
          ? "premium-bundle" 
          : "add-on") as any,
        basePrice: finalPrice,
        quantity: quantity,
      }];

      const res = await buyAdditionalServicesAction(candidateId, servicePayload);
      if (res.success) {
        onClose();
        // hot reload page
        window.location.reload();
      } else {
        alert(res.error || "Failed to purchase additional service.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div 
        className="bg-card border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">Add Service Package</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Purchase catalog items for {candidateName} ({candidateSccgId})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - Split into Catalog list and Config Panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
          {selectedProduct ? (
            /* Configure purchase */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-muted/40 border border-white/5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Selected Catalog Item</span>
                  <button 
                    onClick={() => setSelectedProduct(null)} 
                    className="text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                <h4 className="font-bold text-foreground text-base">{selectedProduct.name}</h4>
                {selectedProduct.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedProduct.description}</p>
                )}
                <div className="text-xs text-muted-foreground font-mono mt-1">SKU: {selectedProduct.sku}</div>
              </div>

              <div className="space-y-4">
                {/* Quantity selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(q => q - 1)}
                      className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center font-bold text-lg hover:bg-white/5 disabled:opacity-40 select-none cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-foreground text-base">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center font-bold text-lg hover:bg-white/5 select-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Base price config */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Base Price (EUR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-muted border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Default base price is €{defaultPrice.toLocaleString()}</p>
                </div>

                {/* Pricing summary */}
                <div className="border border-white/15 rounded-2xl overflow-hidden divide-y divide-white/5 bg-primary/5">
                  <div className="p-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Base Subtotal</span>
                    <span className="font-semibold text-foreground">€{(finalPrice * quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="p-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Partner Markup ({candidateMargin}%)</span>
                    <span className="font-semibold text-emerald-400">€{(finalPrice * quantity * marginPercentage / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="p-4 flex items-center justify-between text-sm font-bold bg-primary/10">
                    <span className="text-foreground">Total Client Amount</span>
                    <span className="text-primary text-base">€{(finalPrice * quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Browse Catalog */
            <div className="flex-1 flex flex-col space-y-4 min-h-0">
              {/* Tabs */}
              <div className="flex border-b border-white/5 gap-4">
                {(["all", "all-inclusive", "premium", "add-on"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.replace("-", " ")}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search catalog items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                />
              </div>

              {/* Catalog list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <ShoppingBag className="w-8 h-8 opacity-40 mb-2" />
                    <p className="text-sm font-semibold">No services found</p>
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const price = p.retailPriceEur || p.price || 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="group bg-muted/40 hover:bg-muted border border-white/5 hover:border-primary/30 p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all duration-200"
                      >
                        <div className="min-w-0">
                          <h5 className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors truncate">
                            {p.name}
                          </h5>
                          {p.description && (
                            <p className="text-muted-foreground text-xs line-clamp-1 mt-1 leading-relaxed">
                              {p.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                              {p.sku}
                            </span>
                            <span className="text-[9px] bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded text-primary font-bold">
                              {p.unit}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-foreground text-sm">
                            €{price.toLocaleString()}
                          </span>
                          <div className="p-1 bg-primary text-primary-foreground rounded-lg group-hover:scale-105 transition-transform">
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        {selectedProduct && (
          <div className="p-6 border-t border-white/5 flex items-center justify-between bg-muted/20">
            <button
              onClick={() => setSelectedProduct(null)}
              className="px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/5 text-foreground transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleCheckout}
              disabled={isPending}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-sm shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  Confirm Purchase <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
