"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { updateSalesOffer, getSalesOfferById, getSalesOfferItems, createSalesOfferItem, deleteSalesOfferItem } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function updateSalesOfferAction(offerId: string, data: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: Array<{ id?: string; productId: string; productName: string; quantity: number; unitPrice: number }>;
  discount: number;
  discountType: "fixed" | "percent";
  validUntil: string;
  notes?: string;
  saleType?: import("@/types").SaleType;
  referralId?: string;
  referralName?: string;
  referralPercent?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;

  const offer = await getSalesOfferById(offerId);
  if (!offer) throw new Error("Offer not found");
  if (user.role !== "admin" && offer.partnerId !== user.partnerId) throw new Error("Forbidden");

  // Re-calculate totals
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount = data.discountType === "percent" ? subtotal * (data.discount / 100) : data.discount;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  await updateSalesOffer(offerId, {
    clientId: data.clientId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    subtotal,
    discount: data.discount,
    discountType: data.discountType,
    totalAmount,
    validUntil: data.validUntil,
    notes: data.notes,
    saleType: data.saleType,
    referralId: data.referralId,
    referralName: data.referralName,
    referralPercent: data.referralPercent,
  });

  // Handle items (delete old, create new)
  // For simplicity, we just delete all existing items and recreate them to avoid complex syncing
  const existingItems = await getSalesOfferItems(offerId);
  for (const item of existingItems) {
    await deleteSalesOfferItem(item.id);
  }

  for (const item of data.items) {
    if (item.productId) {
      await createSalesOfferItem({
        salesOfferId: offerId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      });
    }
  }

  revalidatePath(`/sales/offers/${offerId}`);
  revalidatePath(`/sales/offers`);
  
  return { success: true };
}
