"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import { revalidatePath } from "next/cache";
import { 
  createWithdrawalRequest, 
  updateExpertPaymentPreferences 
} from "@/lib/withdrawals";
import type { WithdrawalRequest, SessionUser } from "@/types";

export async function savePaymentPreferencesAction(
  methodType: "bank_transfer" | "ewallet", 
  methodDetails: string
) {
  try {
    const session = await getEffectiveSession();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const user = session.user as SessionUser;
    if (user.role !== "expert") return { success: false, error: "Only experts can set payment preferences" };

    await updateExpertPaymentPreferences(user.id, methodType, methodDetails);

    revalidatePath("/expert/payments");
    return { success: true };
  } catch (err: any) {
    console.error("savePaymentPreferencesAction Error:", err);
    return { success: false, error: err.message || "Failed to save preferences" };
  }
}

export async function submitWithdrawalRequestAction(
  amount: number, 
  currency: "BDT" | "EUR", 
  methodType: "bank_transfer" | "ewallet",
  methodDetails: string,
  notes?: string
) {
  try {
    const session = await getEffectiveSession();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const user = session.user as SessionUser;
    if (user.role !== "expert") return { success: false, error: "Only experts can request withdrawals" };

    if (!methodDetails || methodDetails.trim() === "") {
      return { success: false, error: "Please provide payment method details before requesting a withdrawal." };
    }

    const payload: Omit<WithdrawalRequest, "id"> = {
      expertId: user.id,
      expertName: user.name || "Expert",
      amount,
      currency,
      status: "requested",
      paymentMethodType: methodType,
      paymentMethodDetails: methodDetails,
      notes,
      requestedAt: new Date().toISOString()
    };

    const newReq = await createWithdrawalRequest(payload);

    revalidatePath("/expert/payments");
    return { success: true, request: newReq };
  } catch (err: any) {
    console.error("submitWithdrawalRequestAction Error:", err);
    return { success: false, error: err.message || "Failed to submit withdrawal request" };
  }
}
