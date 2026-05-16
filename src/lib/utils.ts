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
  // Always use the branded placeholder for a unified marketplace look
  return "/images/product-placeholder.png";
}
