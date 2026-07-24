"use server";

import { revalidatePath } from "next/cache";

export async function refreshProductsAction() {
  try {
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
