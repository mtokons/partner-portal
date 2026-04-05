"use server";

import { auth } from "@/auth";
import type { SessionUser, Product } from "@/types";
import { createProduct } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function createProductAction(data: Omit<Product, "id">) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (user.role !== "admin") throw new Error("Forbidden");

  await createProduct(data);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}
