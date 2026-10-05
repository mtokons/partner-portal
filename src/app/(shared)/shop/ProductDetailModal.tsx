"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Promotion, CartItem } from "@/types";
import { getProductImageUrl } from "@/lib/utils";
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Tag,
  Star,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductDetailModalProps {
  product: Product;
  promotions: Promotion[];
  canSeePrice: boolean;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  cartQuantity: number;
  liveRate?: number;
}

export default function ProductDetailModal({
  product,
  promotions,
  canSeePrice,
  isOpen,
  onClose,
  onAddToCart,
  cartQuantity,
  liveRate = 140.2,
}: ProductDetailModalProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const eurAmount = product.retailPriceEur || product.price || 0;
  const currentRate = liveRate > 0 ? liveRate : 140.2;
  const bdtAmount = Math.round(eurAmount * currentRate);

  // Discount calculation
  const hasDiscount = !!product.discount && product.discount > 0;
  const isUnavailable = product.isAvailable === false;

  function persistCartItem(item: CartItem) {
    if (typeof window === "undefined") return;
    const targetQty = item.quantity && item.quantity > 0 ? item.quantity : 1;
    try {
      const stored = localStorage.getItem("marketplace_cart");
      let existingCart: CartItem[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(existingCart)) existingCart = [];
      const idx = existingCart.findIndex((c) => c.product.id === item.product.id);
      if (idx !== -1) {
        // Enforce maximum 1 qty per item on add/buy until manually adjusted in checkout
        existingCart[idx].quantity = targetQty;
        existingCart[idx].effectivePrice = item.effectivePrice;
      } else {
        existingCart.push({ ...item, quantity: targetQty });
      }
      localStorage.setItem("marketplace_cart", JSON.stringify(existingCart));
      window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: existingCart }));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
      localStorage.setItem("marketplace_cart", JSON.stringify([{ ...item, quantity: targetQty }]));
      window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: [{ ...item, quantity: targetQty }] }));
    }
  }

  function handleAddToCart() {
    if (isUnavailable) return;
    const item: CartItem = {
      product,
      quantity: quantity > 0 ? quantity : 1,
      effectivePrice: eurAmount,
    };
    onAddToCart(item);
    persistCartItem(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  function handleBuyNow() {
    if (isUnavailable) return;
    const item: CartItem = {
      product,
      quantity: quantity > 0 ? quantity : 1,
      effectivePrice: eurAmount,
    };
    onAddToCart(item);
    persistCartItem(item);
    // Navigate directly to checkout
    router.push("/marketplace/checkout");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/90 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top 4-Color German Flag & SCCG Signature Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B] shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0F4C81] border border-blue-200 uppercase tracking-wider">
              {product.category || "Service Package"}
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              SKU: {product.sku}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Close popup"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Product Banner & Logo Area */}
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center gap-6 overflow-hidden">
            {/* Logo Image */}
            <div className="w-32 h-32 rounded-2xl bg-white border border-slate-200/80 p-3 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src={getProductImageUrl(product)}
                alt={product.name}
                className="max-h-full max-w-full object-contain drop-shadow-sm"
              />
            </div>

            {/* Title & Badges */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#0F4C81] text-white shadow-2xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  {product.logoText || "SCCG Germany"}
                </span>
                {hasDiscount && (
                  <Badge className="bg-[#DC2626] text-white border-0 text-[10px] px-2 py-0.5 font-bold">
                    <Tag className="h-2.5 w-2.5 mr-1" />
                    Special Offer
                  </Badge>
                )}
                {product.tags?.includes("bestseller") && (
                  <Badge className="bg-[#F59E0B] text-slate-900 border-0 text-[10px] px-2 py-0.5 font-bold">
                    <Star className="h-2.5 w-2.5 mr-1 fill-slate-900" />
                    Top Pick
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {product.name}
              </h2>

              <p className="text-xs text-slate-500 font-medium">
                {product.sessionsCount > 0 ? `${product.sessionsCount}x ${product.unit} sessions included` : `${product.unit} package`} · Instant digital confirmation
              </p>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0F4C81]" />
              Product Overview &amp; Description
            </h3>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {product.description || "Comprehensive SCCG German career preparation and certified service package. Tailored curriculum with official evaluation and partner advisory support."}
            </div>
          </div>

          {/* Features & Deliverables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-white text-center space-y-1">
              <Clock className="w-4 h-4 text-[#0F4C81] mx-auto" />
              <p className="text-[11px] font-bold text-slate-800">Sessions &amp; Units</p>
              <p className="text-xs text-slate-500 font-semibold">{product.sessionsCount > 0 ? `${product.sessionsCount}x ${product.unit}s` : product.unit}</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white text-center space-y-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="text-[11px] font-bold text-slate-800">Certification</p>
              <p className="text-xs text-slate-500 font-semibold">SCCG Certified Curriculum</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white text-center space-y-1">
              <Sparkles className="w-4 h-4 text-[#F59E0B] mx-auto" />
              <p className="text-[11px] font-bold text-slate-800">Enrollment</p>
              <p className="text-xs text-slate-500 font-semibold">Instant Digital Delivery</p>
            </div>
          </div>

          {/* Live Pricing & Currency Conversion Box */}
          {canSeePrice && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-slate-50 to-amber-50/30 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payable Price</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black bg-gradient-to-r from-[#0F4C81] via-[#1D4ED8] to-[#DC2626] bg-clip-text text-transparent">
                    €{eurAmount.toLocaleString("en-DE", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Inc. VAT</span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-600 px-2">Qty</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-black text-sm w-6 text-center text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Initial Payment Note if applicable */}
          {product.initialPayment && product.initialPayment > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 flex items-center justify-between">
              <span className="font-semibold">Deposit Option:</span>
              <span className="font-black">€{product.initialPayment} Initial Deposit available upon agreement</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {cartQuantity > 0 && (
              <span className="font-bold text-[#0F4C81]">
                ({cartQuantity} currently in cart)
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {isUnavailable ? "Currently out of stock" : "Available for direct booking"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleAddToCart}
              disabled={isUnavailable}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                isUnavailable
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : justAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-300 text-slate-800 hover:bg-slate-100"
              }`}
            >
              {justAdded ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 text-[#0F4C81]" />
                  Add to Cart
                </>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isUnavailable}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 ${
                isUnavailable
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-[#0F4C81] hover:bg-[#0C3E6B] text-white shadow-blue-900/20"
              }`}
            >
              Buy Now
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
