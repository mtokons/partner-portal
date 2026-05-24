"use server";

import { createOrder, createActivity, getClientById } from "@/lib/sharepoint";
import { triggerFlow } from "@/lib/powerautomate";

interface PlaceOrderInput {
  partnerId: string;
  clientId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export async function placeOrderAction(input: PlaceOrderInput) {
  const client = await getClientById(input.clientId);
  const totalAmount = input.quantity * input.unitPrice;

  const order = await createOrder({
    partnerId: input.partnerId,
    clientId: input.clientId,
    clientName: client?.name || "",
    items: [{
      productId: input.productId,
      productName: input.productName,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    }],
    status: "pending",
    totalAmount,
    createdAt: new Date().toISOString(),
  });

  await createActivity({
    partnerId: input.partnerId,
    type: "order",
    description: `New order #${order.id} placed for ${client?.name || "Unknown"} — €${totalAmount.toFixed(2)}`,
    relatedId: order.id,
    createdAt: new Date().toISOString(),
  });

  await triggerFlow("order-placed", {
    orderId: order.id,
    partnerName: input.partnerId,
    clientName: client?.name,
    totalAmount,
  });

  return order;
}
