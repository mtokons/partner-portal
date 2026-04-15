"use server";

import { revalidatePath } from "next/cache";

export async function refreshPayoutsAction() {
  try {
    revalidatePath("/admin/payouts");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
