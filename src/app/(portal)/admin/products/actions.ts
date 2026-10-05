"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import { updateProduct, createProduct, getProducts } from "@/lib/sharepoint";
import type { Product } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Ensures user is authenticated and has administrative permissions.
 */
async function checkAdminAuth() {
  const session = await getEffectiveSession();
  if (!session?.user) {
    throw new Error("Unauthorized. Please sign in.");
  }
  const role = (session.user.role || "").toLowerCase();
  if (role !== "admin" && role !== "superadmin") {
    throw new Error("Forbidden. Administrative role required.");
  }
  return session.user;
}

/**
 * Updates a product's positioning, logo, logo text, pricing, and details.
 */
export async function saveProductAction(id: string, data: Partial<Product>) {
  try {
    await checkAdminAuth();

    const sanitizedData: Partial<Product> = {
      ...data,
      sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
      retailPriceEur: data.retailPriceEur !== undefined ? Number(data.retailPriceEur) : undefined,
      retailPriceBdt: data.retailPriceBdt !== undefined ? Number(data.retailPriceBdt) : undefined,
      sessionsCount: data.sessionsCount !== undefined ? Number(data.sessionsCount) : undefined,
      logoText: data.logoText !== undefined ? String(data.logoText).trim() : undefined,
      logoUrl: data.logoUrl !== undefined ? String(data.logoUrl).trim() : undefined,
      imageUrl: data.imageUrl !== undefined ? String(data.imageUrl).trim() : undefined,
    };

    await updateProduct(id, sanitizedData);

    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
    revalidatePath("/marketplace/checkout");
    revalidatePath("/(shared)/shop", "page");
    revalidatePath("/partner/marketplace");

    return { success: true, message: "Product updated successfully." };
  } catch (error: any) {
    console.error("saveProductAction error:", error);
    return { success: false, error: error.message || "Failed to save product." };
  }
}

/**
 * Updates the display positioning (sort order) for a single product.
 */
export async function updateProductPositionAction(id: string, sortOrder: number) {
  try {
    await checkAdminAuth();
    await updateProduct(id, { sortOrder: Number(sortOrder) });

    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
    revalidatePath("/partner/marketplace");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update position." };
  }
}

/**
 * Shifts product positioning relative to its neighbor (Move Up / Move Down).
 */
export async function shiftProductPositionAction(id: string, direction: "up" | "down") {
  try {
    await checkAdminAuth();
    const allProducts = await getProducts();
    const sorted = [...allProducts].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

    const currentIndex = sorted.findIndex((p) => p.id === id);
    if (currentIndex === -1) throw new Error("Product not found");

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return { success: true }; // already at edge
    }

    const currentProduct = sorted[currentIndex];
    const targetProduct = sorted[targetIndex];

    const currentPos = currentProduct.sortOrder ?? currentIndex + 1;
    const targetPos = targetProduct.sortOrder ?? targetIndex + 1;

    // Swap positions
    const newCurrentPos = targetPos === currentPos ? (direction === "up" ? currentPos - 1 : currentPos + 1) : targetPos;
    const newTargetPos = currentPos;

    await Promise.all([
      updateProduct(currentProduct.id, { sortOrder: newCurrentPos }),
      updateProduct(targetProduct.id, { sortOrder: newTargetPos }),
    ]);

    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
    revalidatePath("/partner/marketplace");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to shift position." };
  }
}

/**
 * Toggles product availability on the marketplace.
 */
export async function toggleProductAvailabilityAction(id: string, isAvailable: boolean) {
  try {
    await checkAdminAuth();
    await updateProduct(id, { isAvailable });

    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle availability." };
  }
}
