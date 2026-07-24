"use server";

import { auth } from "@/auth";
import type { SessionUser, Product } from "@/types";
import { updateProduct } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function updateProductAction(id: string, data: Partial<Product>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (user.role !== "admin") throw new Error("Forbidden");

  await updateProduct(id, data);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}
