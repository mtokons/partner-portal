"use client";

import type { CartItem, Client, SaleType } from "@/types";
import { X, Trash2, Plus, Minus, ShoppingCart, Building2, ChevronDown, ArrowRight } from "lucide-react";
import { useState } from "react";

interface CartDrawerProps {
  cart: CartItem[];
  cartTotal: number;
  selectedClient: Client | null;
  onRemove: (productId: string) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onSelectClient: () => void;
  onCheckout: (saleType: SaleType, referralId?: string, referralName?: string, referralPercent?: number) => void;
  onClose: () => void;
}

const SALE_TYPE_LABELS: Record<SaleType, string> = {
  direct: "Direct Sale",
  "direct-referral": "Direct with Referral",
  "partner-individual": "Partner Sale",
  "partner-institutional": "Institutional Partner",
};

export default function CartDrawer({
  cart,
  cartTotal,
  selectedClient,
  onRemove,
  onUpdateQty,
  onSelectClient,
  onCheckout,
  onClose,
}: CartDrawerProps) {
  const [saleType, setSaleType] = useState<SaleType>("direct");
  const [referralId, setReferralId] = useState("");
  const [referralName, setReferralName] = useState("");
  const [referralPercent, setReferralPercent] = useState(10);
  const [showSaleConfig, setShowSaleConfig] = useState(false);

  const showReferral = saleType === "direct-referral";
  const canCheckout = cart.length > 0 && selectedClient !== null;

  // Responsive cart drawer height: min-h based on cart size, max-h for overflow
  const drawerMinHeight = Math.min(120 + cart.length * 90, 520); // px
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" onClick={onClose} />

      {/* Drawer Card */}
      <div
        className="relative w-full max-w-md bg-card border border-border flex flex-col shadow-2xl rounded-[2.5rem] pointer-events-auto animate-in fade-in slide-in-from-right-8 zoom-in-95 duration-300 overflow-hidden"
        style={{ minHeight: drawerMinHeight, maxHeight: 600 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">Your Cart</h2>
            <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {cart.length} item{cart.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-6">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex gap-3 p-4">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 text-lg">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">BDT {item.effectivePrice.toLocaleString()} / unit</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => onRemove(item.product.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-rose-500 transition-colors" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                      className="h-6 w-6 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                      className="h-6 w-6 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-xs font-black text-foreground">
                    BDT {(item.effectivePrice * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom section */}
        <div className="border-t border-border p-6 space-y-4">
          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-medium">Subtotal</span>
            <span className="text-xl font-black text-foreground">BDT {cartTotal.toLocaleString()}</span>
          </div>

          {/* Client */}
          <button
            onClick={onSelectClient}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
              selectedClient
                ? "border-primary/30 bg-primary/5 text-foreground"
                : "border-dashed border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <Building2 className={`h-4 w-4 shrink-0 ${selectedClient ? "text-primary" : ""}`} />
            <span className="flex-1 text-left text-sm font-medium truncate">
              {selectedClient ? selectedClient.name : "Select a client →"}
            </span>
            {selectedClient && <span className="text-xs text-muted-foreground">{selectedClient.company}</span>}
          </button>

          {/* Sale configuration */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setShowSaleConfig(!showSaleConfig)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <span>Sale Type: <span className="text-primary">{SALE_TYPE_LABELS[saleType]}</span></span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showSaleConfig ? "rotate-180" : ""}`} />
            </button>

            {showSaleConfig && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(SALE_TYPE_LABELS) as [SaleType, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSaleType(val)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                        saleType === val
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {showReferral && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referral Details</p>
                    <input
                      value={referralId}
                      onChange={(e) => setReferralId(e.target.value)}
                      placeholder="Referrer ID"
                      className="w-full px-3 py-2 bg-muted rounded-xl text-xs border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      value={referralName}
                      onChange={(e) => setReferralName(e.target.value)}
                      placeholder="Referrer Name"
                      className="w-full px-3 py-2 bg-muted rounded-xl text-xs border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={referralPercent}
                        onChange={(e) => setReferralPercent(Number(e.target.value))}
                        className="w-20 px-3 py-2 bg-muted rounded-xl text-xs border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="text-xs text-muted-foreground">% commission</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checkout button */}
          <button
            onClick={() => onCheckout(saleType, referralId || undefined, referralName || undefined, referralPercent)}
            disabled={!canCheckout}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all ${
              canCheckout
                ? "bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/25 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <ArrowRight className="h-4 w-4" />
            {canCheckout ? "Create Sales Offer" : "Select a client first"}
          </button>
        </div>
      </div>
    </div>
  );
}
