"use server";

import { auth } from "@/auth";
import type { SessionUser, Promotion } from "@/types";
import { createPromotion } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function createPromotionAction(data: Omit<Promotion, "id">) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (user.role !== "admin") throw new Error("Forbidden");

  await createPromotion(data);
  revalidatePath("/admin/promotions");
}
