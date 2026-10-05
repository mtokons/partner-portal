"use client";

import { useState } from "react";
import type { Product, Promotion, CartItem } from "@/types";
import { getEffectivePrice } from "@/lib/promotions";
import { ShoppingCart, Plus, Tag, Star, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/utils";
import ProductDetailModal from "./ProductDetailModal";

interface ProductCardProps {
  product: Product;
  promotions: Promotion[];
  canSeePrice: boolean;
  onAddToCart: (item: CartItem) => void;
  cartQuantity: number;
  liveRate?: number;
}

export default function ProductCard({
  product,
  promotions,
  canSeePrice,
  onAddToCart,
  cartQuantity,
  liveRate = 140.2,
}: ProductCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { effectivePrice, appliedPromotion, savedAmount } = getEffectivePrice(product, promotions);
  const hasDiscount = savedAmount > 0;
  const isUnavailable = product.isAvailable === false;

  const eurAmount = product.retailPriceEur || effectivePrice;
  const currentRate = liveRate > 0 ? liveRate : 140.2;
  const bdtAmount = Math.round(eurAmount * currentRate);

  function handleAdd() {
    if (isUnavailable) return;
    const itemToAdd: CartItem = {
      product,
      quantity: 1,
      effectivePrice,
      appliedPromotion: appliedPromotion ?? undefined,
    };
    onAddToCart(itemToAdd);

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("marketplace_cart");
        let existingCart: CartItem[] = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(existingCart)) existingCart = [];
        const idx = existingCart.findIndex((c) => c.product.id === product.id);
        if (idx !== -1) {
          // Exactly 1 per item on add/buy until manually adjusted in checkout
          existingCart[idx].quantity = 1;
        } else {
          existingCart.push(itemToAdd);
        }
        localStorage.setItem("marketplace_cart", JSON.stringify(existingCart));
        window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: existingCart }));
      } catch (e) {
        console.error("Failed to save cart to localStorage", e);
        localStorage.setItem("marketplace_cart", JSON.stringify([itemToAdd]));
        window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: [itemToAdd] }));
      }
    }
  }

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className="group relative bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col cursor-pointer"
        title="Click product tile to open details popup"
      >
        {/* 4-Color German & SCCG Top Micro-Ribbon */}
        <div className="h-1 w-full bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B]" />

        {/* Image & Logo area */}
        <div className="relative h-44 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 flex items-center justify-center p-6 border-b border-slate-100 overflow-hidden">
          {/* SCCG Original Logo or Custom Product Logo */}
          <img
            src={getProductImageUrl(product)}
            alt={product.name}
            className="max-h-24 max-w-[75%] object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
          />

          {/* Quick View Hover Indicator */}
          <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="text-[11px] font-bold text-white bg-slate-900/85 px-3 py-1.5 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
              <Eye className="w-3.5 h-3.5 text-blue-200" />
              View Details
            </span>
          </div>

        {/* Branded SKU Overlay */}
        <div className="absolute bottom-2.5 right-3 bg-white/90 backdrop-blur-md border border-slate-200/80 px-2 py-0.5 rounded-lg shadow-2xs">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            SKU {product.sku}
          </p>
        </div>

        {/* Custom Logo Text (Adjustable via Admin Product Management) */}
        <div className="absolute bottom-2.5 left-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C81]" />
            {product.logoText || "SCCG Germany"}
          </span>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <Badge className="bg-[#DC2626] text-white border-0 text-[10px] px-2 py-0.5 font-bold shadow-md">
              <Tag className="h-2.5 w-2.5 mr-1" />
              {appliedPromotion
                ? appliedPromotion.discountType === "percent"
                  ? `${appliedPromotion.discountValue}% OFF`
                  : `€${appliedPromotion.discountValue} OFF`
                : product.discountType === "percent"
                ? `${product.discount}% OFF`
                : `€${product.discount} OFF`}
            </Badge>
          )}
          {product.tags?.includes("new") && (
            <Badge className="bg-emerald-600 text-white border-0 text-[10px] px-2 py-0.5 font-bold shadow-xs">
              NEW
            </Badge>
          )}
          {product.tags?.includes("bestseller") && (
            <Badge className="bg-[#F59E0B] text-slate-900 border-0 text-[10px] px-2 py-0.5 font-bold shadow-xs">
              <Star className="h-2.5 w-2.5 mr-1 fill-slate-900" />
              TOP PICK
            </Badge>
          )}
        </div>

        {/* Cart count badge */}
        {cartQuantity > 0 && (
          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#0F4C81] text-white text-xs font-black flex items-center justify-center shadow-lg">
            {cartQuantity}
          </div>
        )}

        {isUnavailable && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="text-white font-bold text-xs px-3 py-1 bg-black/60 rounded-full">Unavailable</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-900 group-hover:text-[#0F4C81] transition-colors leading-tight line-clamp-2">
              {product.name}
            </h3>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] rounded-full border-slate-200 text-slate-600 bg-slate-50">
            {product.category}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {product.sessionsCount > 0 && (
            <Badge variant="secondary" className="bg-blue-50 text-[#0F4C81] border border-blue-200 text-[10px] font-bold">
               {product.sessionsCount}x {product.unit}s
            </Badge>
          )}
          {product.hasInstallment && (
            <Badge variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold">
              {product.installmentQty ? `${product.installmentQty}x Installments` : "Installments Available"}
            </Badge>
          )}
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 flex-1 mb-4">{product.description}</p>

        {/* Price with Multi-Color Accent */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {canSeePrice ? (
              <>
                <div className="flex flex-col gap-0.5">
                  <p className="text-2xl font-black bg-gradient-to-r from-[#0F4C81] via-[#1D4ED8] to-[#DC2626] bg-clip-text text-transparent leading-none flex items-baseline gap-1">
                    €{eurAmount.toLocaleString("en-DE", { minimumFractionDigits: 2 })}
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Inc. VAT</span>
                  </p>
                </div>
                {hasDiscount && (
                  <p className="text-xs text-slate-400 line-through mt-0.5">
                    €{product.price.toLocaleString("en-DE", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500 italic">Price on request</p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
            disabled={isUnavailable}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              isUnavailable
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-[#0F4C81] hover:bg-[#0C3E6B] text-white shadow-sm hover:shadow-md hover:shadow-blue-900/20 active:scale-95"
            }`}
          >
            {cartQuantity > 0 ? (
              <ShoppingCart className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {cartQuantity > 0 ? "Added" : "Add"}
          </button>
        </div>

        {/* Promotion label */}
        {appliedPromotion && (
          <p className="mt-2 text-[10px] text-emerald-600 font-semibold">
            🎉 {appliedPromotion.title}
          </p>
        )}
      </div>
    </div>

    {/* Product Details Popup Modal */}
    <ProductDetailModal
      product={product}
      promotions={promotions}
      canSeePrice={canSeePrice}
      isOpen={showDetails}
      onClose={() => setShowDetails(false)}
      onAddToCart={onAddToCart}
      cartQuantity={cartQuantity}
      liveRate={currentRate}
    />
  </>
);
}
