"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Product, Promotion, CartItem, Client, SessionUser, SaleType } from "@/types";
import ProductCard from "./ProductCard";
import ProductNewsSlider from "./ProductNewsSlider";
import ClientSelectModal from "./ClientSelectModal";
import CartDrawer from "./CartDrawer";
import { ShoppingCart, Search, SlidersHorizontal, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShopClientProps {
  products: Product[];
  promotions: Promotion[];
  clients: Client[];
  user: SessionUser;
}

export default function ShopClient({ products, promotions, clients, user }: ShopClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Price visible to all internal roles (partner, admin, expert). Hidden roles handled by business rules.
  const canSeePrice = user.role === "admin" || user.role === "partner" || user.role === "expert";

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
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => prev.map((c) => c.product.id === productId ? { ...c, quantity: qty } : c));
  }, [removeFromCart]);

  const cartTotal = cart.reduce((s, i) => s + i.effectivePrice * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const visibleProducts = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (p.isAvailable === false) return false;
    return true;
  });

  // Proceed to create offer from cart
  async function handleCheckout(saleType: SaleType, referralId?: string, referralName?: string, referralPercent?: number) {
    if (!selectedClient || cart.length === 0) return;

    // Encode cart as URL params then redirect to new offer page
    const params = new URLSearchParams({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      saleType,
      ...(referralId ? { referralId, referralName: referralName || "", referralPercent: String(referralPercent || 0) } : {}),
    });

    // Store cart in sessionStorage for the new offer page to pick up
    sessionStorage.setItem("shopCart", JSON.stringify(
      cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.effectivePrice,
      }))
    ));

    router.push(`/sales/offers/new?${params.toString()}`);
  }

  function handleClientSelect(client: Client) {
    setSelectedClient(client);
    setClientModalOpen(false);
  }

  function handleCreateNewClient(data: { name: string; email: string; company: string; phone: string }) {
    // Create a temporary client object; actual creation happens on offer submission
    const tempClient: Client = {
      id: `temp_${Date.now()}`,
      partnerId: user.partnerId || user.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      createdAt: new Date().toISOString(),
    };
    setSelectedClient(tempClient);
    setClientModalOpen(false);
  }

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-blue" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">B2B Shop</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            SCCG{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Sales Shop
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {products.length} products available · Build your offer in seconds
          </p>
        </div>

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-primary/25 transition-all active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-background">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* News Slider */}
      {promotions.length > 0 && (
        <ProductNewsSlider promotions={promotions} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "All Products" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
        <div className="py-24 text-center">
          <Store className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          cartTotal={cartTotal}
          selectedClient={selectedClient}
          onRemove={removeFromCart}
          onUpdateQty={updateQty}
          onSelectClient={() => setClientModalOpen(true)}
          onCheckout={handleCheckout}
          onClose={() => setCartOpen(false)}
        />
      )}

      {/* Client Select Modal */}
      {clientModalOpen && (
        <ClientSelectModal
          clients={clients}
          onSelect={handleClientSelect}
          onCreateNew={handleCreateNewClient}
          onClose={() => setClientModalOpen(false)}
        />
      )}
    </div>
  );
}
