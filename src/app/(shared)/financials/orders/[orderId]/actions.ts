"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getSalesOrderById, updateSalesOrder, createTransaction } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function paySalesOrderAction(orderId: string, method: string) {
  const session = await getEffectiveSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  const user = session.user as SessionUser;
  const order = await getSalesOrderById(orderId);
  
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "completed" || order.status === "in-progress") {
    return { success: true };
  }

  // Record global transaction if applicable
  if (user.partnerId && order.totalAmount > 0) {
    await createTransaction({
      clientId: order.clientId,
      partnerId: user.partnerId,
      type: "payment",
      amount: order.totalAmount,
      reference: `Order ${order.orderNumber}`,
      description: `Payment for Order ${order.orderNumber} via ${method}`,
      date: new Date().toISOString(),
    });
  }

  // Update order status
  await updateSalesOrder(orderId, {
    status: "completed",
    updatedAt: new Date().toISOString(),
  });

  revalidatePath(`/financials/orders/${orderId}`);
  revalidatePath("/partner/finance");
  revalidatePath("/partner/finance/payments");
  
  return { success: true };
}
