"use client";

import type { Product, Promotion, CartItem } from "@/types";
import { getEffectivePrice } from "@/lib/promotions";
import { ShoppingCart, Plus, Package, Tag, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  promotions: Promotion[];
  canSeePrice: boolean;
  onAddToCart: (item: CartItem) => void;
  cartQuantity: number;
}

export default function ProductCard({
  product,
  promotions,
  canSeePrice,
  onAddToCart,
  cartQuantity,
}: ProductCardProps) {
  const { effectivePrice, appliedPromotion, savedAmount } = getEffectivePrice(product, promotions);
  const hasDiscount = savedAmount > 0;
  const isOutOfStock = product.isAvailable === false || (product.stock !== undefined && product.stock <= 0);

  function handleAdd() {
    if (isOutOfStock) return;
    onAddToCart({
      product,
      quantity: 1,
      effectivePrice,
      appliedPromotion: appliedPromotion ?? undefined,
    });
  }

  return (
    <div className="group relative bg-card border border-border/60 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Image area */}
      <div className="relative h-48 bg-gradient-to-br from-muted/60 to-muted overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <Badge className="bg-rose-500 text-white border-0 text-[10px] px-2 py-0.5 font-black shadow-lg">
              <Tag className="h-2.5 w-2.5 mr-1" />
              {appliedPromotion
                ? appliedPromotion.discountType === "percent"
                  ? `${appliedPromotion.discountValue}% OFF`
                  : `BDT ${appliedPromotion.discountValue} OFF`
                : product.discountType === "percent"
                ? `${product.discount}% OFF`
                : `BDT ${product.discount} OFF`}
            </Badge>
          )}
          {product.tags?.includes("new") && (
            <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-2 py-0.5 font-black">
              NEW
            </Badge>
          )}
          {product.tags?.includes("bestseller") && (
            <Badge className="bg-amber-500 text-white border-0 text-[10px] px-2 py-0.5 font-black">
              <Star className="h-2.5 w-2.5 mr-1 fill-white" />
              BEST
            </Badge>
          )}
        </div>

        {/* Cart count badge */}
        {cartQuantity > 0 && (
          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shadow-lg">
            {cartQuantity}
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm px-3 py-1 bg-black/60 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-foreground leading-tight line-clamp-2">{product.name}</h3>
          <Badge variant="outline" className="shrink-0 text-[10px] rounded-full">
            {product.category}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-4">{product.description}</p>

        {/* Price */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {canSeePrice ? (
              <>
                <p className="text-2xl font-black text-primary leading-none">
                  BDT {effectivePrice.toLocaleString()}
                </p>
                {hasDiscount && (
                  <p className="text-xs text-muted-foreground line-through mt-0.5">
                    BDT {product.price.toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Price on request</p>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isOutOfStock
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-white hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
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
  );
}
