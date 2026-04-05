"use server";

import { auth } from "@/auth";
import type { SessionUser, SalesOfferStatus } from "@/types";
import {
  getSalesOffers, getSalesOfferById, createSalesOffer, updateSalesOffer, deleteSalesOffer,
  getSalesOfferItems, createSalesOfferItem,
  getSalesOrders, getSalesOrderById, updateSalesOrder,
  getSalesOrderItems,
  getServiceTasks, createServiceTask, updateServiceTask,
  generateOfferNumber, convertOfferToOrder,
  getClients, getProducts,
} from "@/lib/sharepoint";
import { sendClientEmail } from "@/lib/powerautomate";
import { revalidatePath } from "next/cache";

// ── Helpers ──

async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as SessionUser;
}

function canAccessOffer(user: SessionUser, partnerId: string): boolean {
  return user.role === "admin" || user.partnerId === partnerId;
}

// ── Sales Offer actions ──

export async function createSalesOfferAction(data: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
  discount: number;
  discountType: "fixed" | "percent";
  validUntil: string;
  notes?: string;
}) {
  const user = await requireUser();
  const offerNumber = await generateOfferNumber();
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount = data.discountType === "percent" ? subtotal * (data.discount / 100) : data.discount;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const now = new Date().toISOString();

  const offer = await createSalesOffer({
    offerNumber,
    partnerId: user.partnerId || user.id,
    partnerName: user.name,
    clientId: data.clientId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    status: "draft",
    subtotal,
    discount: data.discount,
    discountType: data.discountType,
    totalAmount,
    validUntil: data.validUntil,
    notes: data.notes,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });

  // Create line items
  for (const item of data.items) {
    await createSalesOfferItem({
      salesOfferId: offer.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    });
  }

  revalidatePath("/sales/offers");
  return { success: true, offerId: offer.id, offerNumber };
}

export async function updateOfferStatusAction(offerId: string, status: SalesOfferStatus) {
  const user = await requireUser();
  const offer = await getSalesOfferById(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (!canAccessOffer(user, offer.partnerId)) return { success: false, message: "Forbidden" };

  const updates: Partial<typeof offer> = { status };
  const now = new Date().toISOString();
  if (status === "sent") updates.sentAt = now;
  if (status === "accepted") updates.acceptedAt = now;
  if (status === "rejected") updates.rejectedAt = now;

  await updateSalesOffer(offerId, updates);
  revalidatePath("/sales/offers");
  revalidatePath(`/sales/offers/${offerId}`);
  return { success: true };
}

export async function deleteOfferAction(offerId: string) {
  const user = await requireUser();
  const offer = await getSalesOfferById(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (!canAccessOffer(user, offer.partnerId)) return { success: false, message: "Forbidden" };
  if (offer.status !== "draft") return { success: false, message: "Only draft offers can be deleted" };

  await deleteSalesOffer(offerId);
  revalidatePath("/sales/offers");
  return { success: true };
}

export async function convertOfferToOrderAction(offerId: string) {
  const user = await requireUser();
  const offer = await getSalesOfferById(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (!canAccessOffer(user, offer.partnerId)) return { success: false, message: "Forbidden" };

  try {
    const order = await convertOfferToOrder(offerId);
    revalidatePath("/sales/offers");
    revalidatePath("/sales/orders");
    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

export async function sendOfferEmailAction(offerId: string) {
  const user = await requireUser();
  const offer = await getSalesOfferById(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (!canAccessOffer(user, offer.partnerId)) return { success: false, message: "Forbidden" };
  if (!offer.clientEmail) return { success: false, message: "Client email not set" };

  const items = await getSalesOfferItems(offerId);
  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${i.productName}</td>` +
        `<td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>` +
        `<td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">BDT ${i.unitPrice.toLocaleString()}</td>` +
        `<td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">BDT ${i.totalPrice.toLocaleString()}</td></tr>`
    )
    .join("");

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e40af;">Sales Offer ${offer.offerNumber}</h2>
      <p>Dear ${offer.clientName},</p>
      <p>Please find below our offer details:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Product</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">Qty</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Unit Price</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <table style="width:100%;margin:16px 0;">
        <tr><td style="padding:4px;"><strong>Subtotal:</strong></td><td style="text-align:right;">BDT ${offer.subtotal.toLocaleString()}</td></tr>
        ${offer.discount > 0 ? `<tr><td style="padding:4px;"><strong>Discount (${offer.discountType === "percent" ? offer.discount + "%" : "fixed"}):</strong></td><td style="text-align:right;">-BDT ${(offer.subtotal - offer.totalAmount).toLocaleString()}</td></tr>` : ""}
        <tr style="font-size:1.2em;font-weight:bold;"><td style="padding:4px;">Total:</td><td style="text-align:right;color:#1e40af;">BDT ${offer.totalAmount.toLocaleString()}</td></tr>
      </table>
      <p><strong>Valid until:</strong> ${new Date(offer.validUntil).toLocaleDateString()}</p>
      ${offer.notes ? `<p><strong>Notes:</strong> ${offer.notes}</p>` : ""}
      <p style="margin-top:24px;">We look forward to hearing from you.</p>
      <p>Best regards,<br/>${offer.partnerName || "Partner Portal"}</p>
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;"/>
      <p style="color:#9ca3af;font-size:12px;">This offer was generated by Partner Portal.</p>
    </div>`;

  const result = await sendClientEmail({
    recipientEmail: offer.clientEmail,
    recipientName: offer.clientName || "",
    subject: `Sales Offer ${offer.offerNumber} — ${offer.partnerName || "Partner Portal"}`,
    htmlBody,
    senderName: offer.partnerName || user.name,
  });

  if (result.success && offer.status === "draft") {
    await updateSalesOffer(offerId, { status: "sent", sentAt: new Date().toISOString() });
    revalidatePath("/sales/offers");
  }

  return result;
}

// ── Sales Order actions ──

export async function updateOrderStatusAction(orderId: string, status: "pending" | "in-progress" | "completed" | "cancelled") {
  const user = await requireUser();
  const order = await getSalesOrderById(orderId);
  if (!order) return { success: false, message: "Order not found" };
  if (!canAccessOffer(user, order.partnerId)) return { success: false, message: "Forbidden" };

  const updates: Partial<typeof order> = { status };
  if (status === "completed") updates.completedAt = new Date().toISOString();

  await updateSalesOrder(orderId, updates);
  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${orderId}`);
  return { success: true };
}

// ── Service Task actions ──

export async function createServiceTaskAction(data: {
  salesOrderId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
}) {
  const user = await requireUser();
  const order = await getSalesOrderById(data.salesOrderId);
  if (!order) return { success: false, message: "Order not found" };
  if (!canAccessOffer(user, order.partnerId)) return { success: false, message: "Forbidden" };

  await createServiceTask({
    salesOrderId: data.salesOrderId,
    orderNumber: order.orderNumber,
    title: data.title,
    description: data.description,
    assignedTo: data.assignedTo,
    status: "planned",
    dueDate: data.dueDate,
    createdAt: new Date().toISOString(),
  });

  revalidatePath(`/sales/orders/${data.salesOrderId}`);
  return { success: true };
}

export async function updateServiceTaskStatusAction(taskId: string, status: "planned" | "in-progress" | "completed" | "cancelled") {
  const user = await requireUser();
  const updates: Partial<{ status: typeof status; completedAt: string }> = { status };
  if (status === "completed") updates.completedAt = new Date().toISOString();

  await updateServiceTask(taskId, updates);
  revalidatePath("/sales/orders");
  return { success: true };
}

// ── Data loading helpers (for pages) ──

export async function loadOffersPageData() {
  const user = await requireUser();
  const partnerId = user.role === "admin" ? undefined : user.partnerId;
  const [offers, clients] = await Promise.all([
    getSalesOffers(partnerId),
    getClients(partnerId),
  ]);
  return { offers, clients, user };
}

export async function loadOfferDetailData(offerId: string) {
  const user = await requireUser();
  const [offer, items] = await Promise.all([
    getSalesOfferById(offerId),
    getSalesOfferItems(offerId),
  ]);
  if (!offer) return null;
  if (!canAccessOffer(user, offer.partnerId)) return null;
  return { offer, items, user };
}

export async function loadCreateOfferData() {
  const user = await requireUser();
  const partnerId = user.role === "admin" ? undefined : user.partnerId;
  const [clients, products] = await Promise.all([
    getClients(partnerId),
    getProducts(),
  ]);
  return { clients, products, user };
}

export async function loadOrdersPageData() {
  const user = await requireUser();
  const partnerId = user.role === "admin" ? undefined : user.partnerId;
  const orders = await getSalesOrders(partnerId);
  return { orders, user };
}

export async function loadOrderDetailData(orderId: string) {
  const user = await requireUser();
  const [order, items, tasks] = await Promise.all([
    getSalesOrderById(orderId),
    getSalesOrderItems(orderId),
    getServiceTasks(orderId),
  ]);
  if (!order) return null;
  if (!canAccessOffer(user, order.partnerId)) return null;
  return { order, items, tasks, user };
}
