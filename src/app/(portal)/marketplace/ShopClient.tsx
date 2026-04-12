"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Product, Promotion, CartItem, SessionUser } from "@/types";
import ProductCard from "../shop/ProductCard";
import ProductNewsSlider from "../shop/ProductNewsSlider";
import { ShoppingCart, Search, SlidersHorizontal, Store, ArrowRight, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShopClientProps {
  products: Product[];
  promotions: Promotion[];
  user: SessionUser;
}

export default function ShopClient({ products, promotions, user }: ShopClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const canSeePrice = true; // Marketplace always shows price

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.findIndex((c) => c.product.id === item.product.id);
      if (existing !== -1) {
        return prev.map((c, i) =>
          i === existing ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, item];
    });
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.effectivePrice * i.quantity, 0);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const visibleProducts = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (p.isAvailable === false) return false;
    return true;
  });

  function handleProceedToCheckout() {
    if (cart.length === 0) return;
    // Store cart in localStorage for the checkout page
    localStorage.setItem("marketplace_cart", JSON.stringify(cart));
    router.push("/marketplace/checkout");
  }

  return (
    <div className="space-y-8 page-enter pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gradient-to-br from-primary/10 via-background to-background p-8 rounded-[2rem] border border-primary/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary text-white border-0 uppercase tracking-tighter text-[10px] px-2 py-0.5">Live Store</Badge>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">SCCG Marketplace</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">
            The Future of{" "}
            <span className="text-primary bg-primary/5 px-2 rounded-lg">Service Delivery</span>
          </h1>
          <p className="text-muted-foreground max-w-md">
            Direct access to premium SCCG service packages. Instant enrollment, secure payments, and worldwide delivery.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-muted-foreground uppercase">Cart Subtotal</p>
            <p className="text-xl font-black text-primary">BDT {cartTotal.toLocaleString()}</p>
          </div>
          <button
            onClick={handleProceedToCheckout}
            disabled={cart.length === 0}
            className="group relative flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:opacity-90 shadow-2xl shadow-primary/40 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            <ShoppingBag className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            Checkout Now
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            {cartCount > 0 && (
              <span className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center border-4 border-background animate-in zoom-in duration-300">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero Promotions */}
      {promotions.length > 0 && (
        <ProductNewsSlider promotions={promotions} />
      )}

      {/* Shopping Interface */}
      <div className="flex flex-col space-y-6">
        <div className="flex flex-wrap gap-4 items-center justify-between border-b border-border/40 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar max-w-full">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "All Collections" : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or SKU..."
              className="w-full pl-10 pr-4 py-3 bg-muted/50 border-0 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
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
              />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/40">
            <Store className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground">Marketplace result empty</h3>
            <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs mx-auto">We couldn't find any products matching your current filters. Try resetting them!</p>
            <button onClick={() => { setSearch(""); setCategoryFilter("all"); }} className="mt-6 text-primary font-bold text-sm hover:underline">Reset all filters</button>
          </div>
        )}
      </div>

      {/* Floating Cart Indicator (Mobile) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 md:hidden">
        {cartCount > 0 && (
          <button
            onClick={handleProceedToCheckout}
            className="flex items-center gap-4 px-6 py-4 bg-primary text-white rounded-full shadow-2xl font-black text-sm ring-4 ring-background"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Pay BDT {cartTotal.toLocaleString()}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-lg ml-1">{cartCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}
