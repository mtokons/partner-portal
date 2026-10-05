"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Product, Promotion, CartItem, SessionUser } from "@/types";
import ProductCard from "@/app/(shared)/shop/ProductCard";
import MarketplaceHeroSlider from "./components/MarketplaceHeroSlider";
import MarketplaceOnboardingModal from "./components/MarketplaceOnboardingModal";
import {
  ShoppingCart,
  Search,
  SlidersHorizontal,
  Store,
  ArrowRight,
  ShoppingBag,
  LogIn,
  UserPlus,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShopClientProps {
  products: Product[];
  promotions: Promotion[];
  user?: SessionUser | null;
  liveEurToBdtRate?: number;
}

export default function ShopClient({
  products,
  promotions,
  user,
  liveEurToBdtRate = 140.2,
}: ShopClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Effective live rate with 2.5% Bangladesh Government Incentive / Bonus
  const effectiveRate = Number((liveEurToBdtRate * 1.025).toFixed(2));

  const canSeePrice = true; // Marketplace always shows price

  // Load cart from localStorage on mount and sync across tabs/modals
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("marketplace_cart");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load cart in ShopClient:", e);
      }

      const handleCartUpdate = (e: Event) => {
        const customEvt = e as CustomEvent<CartItem[]>;
        if (customEvt.detail && Array.isArray(customEvt.detail)) {
          setCart(customEvt.detail);
        } else {
          try {
            const stored = localStorage.getItem("marketplace_cart");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) setCart(parsed);
            }
          } catch {}
        }
      };

      window.addEventListener("sccg_cart_updated", handleCartUpdate);
      window.addEventListener("storage", handleCartUpdate);
      return () => {
        window.removeEventListener("sccg_cart_updated", handleCartUpdate);
        window.removeEventListener("storage", handleCartUpdate);
      };
    }
  }, []);

  // Automatically trigger onboarding modal for first-time visitors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const permanentHide = localStorage.getItem("sccg_marketplace_guide_permanent_hide");
      const seen = localStorage.getItem("sccg_marketplace_guide_seen");

      if (!permanentHide && !seen) {
        const timer = setTimeout(() => {
          setIsGuideOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.findIndex((c) => c.product.id === item.product.id);
      const targetQty = item.quantity && item.quantity > 0 ? item.quantity : 1;
      let updated: CartItem[];
      if (existing !== -1) {
        // Enforce maximum 1 qty per item on add/buy until manually adjusted in checkout
        updated = prev.map((c, i) =>
          i === existing ? { ...c, quantity: targetQty, effectivePrice: item.effectivePrice } : c
        );
      } else {
        updated = [...prev, { ...item, quantity: targetQty }];
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("marketplace_cart", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: updated }));
      }
      return updated;
    });
  }, []);

  const cartCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const cartTotal = cart.reduce((s, i) => s + i.effectivePrice * (i.quantity || 1), 0);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const visibleProducts = products
    .filter((p) => {
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase()) &&
        !p.sku.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (p.isAvailable === false) return false;
      return true;
    })
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  function handleProceedToCheckout() {
    if (cart.length === 0) return;
    // Store cart in localStorage for the checkout page
    localStorage.setItem("marketplace_cart", JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: cart }));
    router.push("/marketplace/checkout");
  }

  return (
    <div className="space-y-8 page-enter pb-24">
      {/* ── Dynamic Hero Slider with Multiple Banners & Live Rates ──────────── */}
      <MarketplaceHeroSlider
        promotions={promotions}
        liveEurToBdtRate={liveEurToBdtRate}
        cartTotal={cartTotal}
        cartCount={cartCount}
        onProceedToCheckout={handleProceedToCheckout}
        onOpenGuide={() => setIsGuideOpen(true)}
        onSelectCategory={(cat) => {
          if (cat === "all") {
            setCategoryFilter("all");
          } else {
            // Find closest category match
            const match = categories.find((c) =>
              c.toLowerCase().includes(cat.toLowerCase())
            );
            setCategoryFilter(match || "all");
          }
        }}
      />

      {/* ── Guest Notice & Quick Guide Trigger Bar ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-xs text-slate-700 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-xs shrink-0" />
          <span>
            {user ? (
              <>
                Logged in as <strong>{user.name || user.email}</strong> ({user.role}). Student &amp; partner discounts are automatically applied at checkout.
              </>
            ) : (
              <>
                Browsing as a <strong>guest</strong>. Log in or create your SCCG account to unlock student discounts, partner margins, and track certificates.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* How to Order Guide Button */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-3.5 py-1.5 font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0F4C81] border border-blue-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Open visual block diagram guide on how to order"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to Order</span>
          </button>

          {!user && (
            <>
              <Link
                href="/login?callbackUrl=/marketplace"
                className="px-3.5 py-1.5 font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#0F4C81]" />
                Log In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 font-bold rounded-xl bg-gradient-to-r from-[#0F4C81] to-[#1D4ED8] hover:from-[#0C3E6B] hover:to-[#1E40AF] text-white shadow-sm transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register Free
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Shopping Interface & Product Catalog ────────────────────────────── */}
      <div id="marketplace-catalog" className="flex flex-col space-y-6 scroll-mt-20">
        <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar max-w-full">
            <SlidersHorizontal className="h-4 w-4 text-slate-500 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? "bg-[#0F4C81] text-white shadow-sm border border-[#0F4C81]"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                }`}
              >
                {cat === "all" ? "All Collections" : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services or SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/25 focus:border-[#0F4C81] shadow-2xs transition-all"
            />
          </div>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                promotions={promotions}
                canSeePrice={canSeePrice}
                onAddToCart={addToCart}
                cartQuantity={cart.find((c) => c.product.id === product.id)?.quantity || 0}
                liveRate={effectiveRate}
              />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/40">
            <Store className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground">Marketplace result empty</h3>
            <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs mx-auto">
              We couldn't find any products matching your current filters. Try resetting them!
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
              }}
              className="mt-6 text-[#0F4C81] font-bold text-sm hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Floating Cart Indicator (Mobile) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 md:hidden">
        {cartCount > 0 && (
          <button
            onClick={handleProceedToCheckout}
            className="flex items-center gap-4 px-6 py-4 bg-[#0F4C81] text-white rounded-full shadow-2xl font-black text-sm ring-4 ring-white"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Pay €{cartTotal.toLocaleString()}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-lg ml-1">{cartCount}</span>
          </button>
        )}
      </div>

      {/* ── First-Time Visitor & Onboarding Guide Modal ────────────────────── */}
      <MarketplaceOnboardingModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
