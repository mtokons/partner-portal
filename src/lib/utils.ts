import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Deterministic placeholder image for a product when no imageUrl is provided.
 * Uses picsum.photos with a stable seed derived from the product id/name so the
 * same product always shows the same image.
 */
export function getProductImageUrl(product: { id?: string; name?: string; imageUrl?: string | null }): string {
  if (product.imageUrl && product.imageUrl.trim().length > 0) return product.imageUrl;
  const seed = encodeURIComponent((product.id || product.name || "sccg-product").toString().slice(0, 64));
  return `https://picsum.photos/seed/${seed}/640/400`;
}
