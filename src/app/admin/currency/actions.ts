"use server";

import { revalidatePath } from "next/cache";
import { updatePartnerCurrency } from "@/lib/sharepoint";
import { assertAdmin } from "@/lib/admin-guard";
import { clearCurrencyCache } from "@/lib/currency";

export async function updatePartnerCurrencyAction(partnerId: string, currency: string) {
  try {
    await assertAdmin();
    await updatePartnerCurrency(partnerId, currency);
    revalidatePath("/admin/partners");
    revalidatePath("/admin/currency");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function refreshRatesAction() {
  try {
    await assertAdmin();
    await clearCurrencyCache();
    revalidatePath("/admin/currency");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
