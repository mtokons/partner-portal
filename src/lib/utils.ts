import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the product logo or image.
 * Uses custom logoUrl or imageUrl if set, and defaults to our official SCCG logo.
 */
export function getProductImageUrl(product: {
  id?: string;
  name?: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
}): string {
  if (product.logoUrl && product.logoUrl.trim()) {
    return product.logoUrl.trim();
  }
  if (
    product.imageUrl &&
    product.imageUrl.trim() &&
    product.imageUrl !== "/images/product-placeholder.png"
  ) {
    return product.imageUrl.trim();
  }
  // User explicitly requested: "Product logo Chage to our SCCG orginal logo."
  return "/assets/sccg-logo.png";
}

