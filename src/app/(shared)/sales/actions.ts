"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser, SalesOfferStatus } from "@/types";
import {
  getSalesOffers, getSalesOfferById, createSalesOffer, updateSalesOffer, deleteSalesOffer,
  getSalesOfferItems, createSalesOfferItem,
  getSalesOrders, getSalesOrderById, updateSalesOrder,
  getSalesOrderItems,
  getServiceTasks, createServiceTask, updateServiceTask,
  generateOfferNumber, convertOfferToOrder,
  getClients, getProducts, getPartnerByEmail, getCommissionRules, getPromoCodeByCode,
  createInvoice, createTransaction, createCustomerPackage, createGiftCard, generateGiftCardNumber, getTransactionsByClient,
  createEmailTracking,
} from "@/lib/sharepoint";
import { calculateCommission } from "@/lib/engine/commission";
import { sendClientEmail } from "@/lib/powerautomate";
import { revalidatePath } from "next/cache";
import { isAdministrativeUser } from "@/lib/permissions";

// ── Helpers ──

async function requireUser(): Promise<SessionUser> {
  const session = await getEffectiveSession();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as SessionUser;
}

function canAccessRecord(user: SessionUser, record: { partnerId: string; createdBy: string }): boolean {
  if (isAdministrativeUser(user)) return true;
  if (user.role === "partner") return record.createdBy === user.id;
  return user.partnerId === record.partnerId;
}

function isPendingMarketplacePaymentVerification(notes?: string): boolean {
  if (!notes) return false;
  return (
    notes.includes("Payment verification: pending-admin-verification") ||
    notes.includes("Payment Status: Pending Admin Verification")
  );
}

function markMarketplacePaymentVerified(notes: string | undefined, adminName: string): string {
  const baseNotes = notes || "";
  if (baseNotes.includes("Payment verification: verified") || baseNotes.includes("Payment Status: Verified")) return baseNotes;
  let updated = baseNotes.replace(
    "Payment verification: pending-admin-verification",
    `Payment verification: verified\nVerified by: ${adminName}\nVerified at: ${new Date().toISOString()}`
  );
  if (updated !== baseNotes) return updated;
  updated = baseNotes.replace(
    "Payment Status: Pending Admin Verification",
    `Payment Status: Verified\nVerified by: ${adminName}\nVerified at: ${new Date().toISOString()}`
  );
  if (updated !== baseNotes) return updated;
  return `${baseNotes}${baseNotes ? "\n" : ""}Payment verification: verified\nVerified by: ${adminName}\nVerified at: ${new Date().toISOString()}`;
}

async function confirmMarketplacePaymentAndActivateServices(order: NonNullable<Awaited<ReturnType<typeof getSalesOrderById>>>) {
  try {
    const existingTx = await getTransactionsByClient(order.clientId);
    if (existingTx && existingTx.some((tx) => tx.orderId === order.id && tx.type === "payment")) return;

    const now = new Date().toISOString();
    const referenceMatch = order.notes?.match(/Payment reference:\s*(.+)/i) || order.notes?.match(/Payment Reference \/ TrxID:\s*(.+)/i);
    const paymentReference = referenceMatch?.[1]?.trim() || `Direct-Order-${order.orderNumber}`;
    const items = await getSalesOrderItems(order.id);

    try {
      await createInvoice({
        partnerId: order.partnerId,
        clientId: order.clientId,
        clientName: order.clientName,
        orderId: order.id,
        amount: order.totalAmount,
        status: "paid",
        dueDate: now,
        createdAt: now,
      });
    } catch (invErr) {
      console.warn("Could not create invoice during payment confirmation:", invErr);
    }

    try {
      await createTransaction({
        clientId: order.clientId,
        partnerId: order.partnerId,
        type: "payment",
        amount: order.totalAmount,
        reference: paymentReference,
        orderId: order.id,
        description: `Marketplace payment verified for order ${order.orderNumber}`,
        date: now,
      });
    } catch (txErr) {
      console.warn("Could not create transaction during payment confirmation:", txErr);
    }

    const products = await getProducts();
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && (product.category === "service" || product.unit === "Package")) {
        try {
          await createCustomerPackage({
            customerId: order.clientId,
            customerName: order.clientName || "",
            partnerId: order.partnerId,
            servicePackageId: product.id,
            packageName: product.name,
            orderId: order.id,
            totalSessions: product.sessionsCount || 1,
            completedSessions: 0,
            totalAmount: item.totalPrice,
            amountPaid: item.totalPrice,
            startDate: now,
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            status: "active",
            createdAt: now,
          });
        } catch (pkgErr) {
          console.warn("Could not create customer package:", pkgErr);
        }
      }

      if (product && product.category === "Gift Card") {
        for (let q = 0; q < item.quantity; q++) {
          try {
            const { hash: __pinHash } = (await import("@/lib/pin")).generateGiftCardPinWithHash(4);
            await createGiftCard({
              sccgId: `GC-${order.orderNumber}-${q + 1}`,
              cardNumber: generateGiftCardNumber(),
              pinHash: __pinHash,
              pinAttempts: 0,
              issuedToUserId: order.clientId,
              issuedToName: order.clientName || "",
              issuedToEmail: order.clientEmail || "",
              issuedByUserId: order.createdBy,
              issuedBy: order.partnerName || "SCCG",
              initialBalance: item.unitPrice,
              currentBalance: item.unitPrice,
              balance: item.unitPrice,
              currency: "EUR",
              tier: "standard",
              status: "active",
              designTemplate: "standard",
              notes: `Purchased via Order ${order.orderNumber}`,
              activatedAt: now,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              issuedAt: now,
              createdAt: now,
            });
          } catch (gcErr) {
            console.warn("Could not create gift card:", gcErr);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error confirming payment and activating services:", err);
  }
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
  saleType?: import("@/types").SaleType;
  referralId?: string;
  referralName?: string;
  referralPercent?: number;
  promoCodeValue?: string;
}) {
  const user = await requireUser();
  const offerNumber = await generateOfferNumber();
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount = data.discountType === "percent" ? subtotal * (data.discount / 100) : data.discount;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const now = new Date().toISOString();

  // --- Commission Engine Integration ---
  let commissionPercent = data.referralPercent || 0;
  let commissionAmount = totalAmount * (commissionPercent / 100);
  let commissionRuleId: string | undefined;

  try {
    const [rules, partner, promoCode] = await Promise.all([
      getCommissionRules(),
      user.email ? getPartnerByEmail(user.email) : null,
      data.promoCodeValue ? getPromoCodeByCode(data.promoCodeValue) : null,
    ]);

    const result = calculateCommission(
      { totalAmount },
      data.items.map(i => ({ ...i, id: "", salesOfferId: "", totalPrice: i.quantity * i.unitPrice })),
      partner,
      promoCode,
      rules
    );

    if (result) {
      commissionPercent = result.percent;
      commissionAmount = result.amount;
      commissionRuleId = result.ruleId;
    }
  } catch (err) {
    console.warn("Commission calculation failed, falling back to manual/zero:", err);
  }
  // --------------------------------------

  const offer = await createSalesOffer({
    offerNumber,
    partnerId: user.partnerId || user.id,
    partnerName: user.name,
    clientId: data.clientId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    status: "draft",
    saleType: data.saleType || "direct",
    referralId: data.referralId,
    referralName: data.referralName,
    referralPercent: data.referralPercent,
    subtotal,
    discount: data.discount,
    discountType: data.discountType,
    totalAmount,
    validUntil: data.validUntil,
    notes: data.notes,
    promoCodeValue: data.promoCodeValue,
    commissionPercent,
    commissionAmount,
    commissionRuleId,
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
  if (!canAccessRecord(user, offer)) return { success: false, message: "Forbidden" };

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
  if (!canAccessRecord(user, offer)) return { success: false, message: "Forbidden" };
  if (offer.status !== "draft") return { success: false, message: "Only draft offers can be deleted" };

  await deleteSalesOffer(offerId);
  revalidatePath("/sales/offers");
  return { success: true };
}

export async function convertOfferToOrderAction(offerId: string) {
  const user = await requireUser();
  const offer = await getSalesOfferById(offerId);
  if (!offer) return { success: false, message: "Offer not found" };
  if (!canAccessRecord(user, offer)) return { success: false, message: "Forbidden" };

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
  if (!canAccessRecord(user, offer)) return { success: false, message: "Forbidden" };
  if (!offer.clientEmail) return { success: false, message: "Client email not set" };

  const items = await getSalesOfferItems(offerId);
  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${i.productName}</td>` +
        `<td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>` +
        `<td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">€${i.unitPrice.toLocaleString()}</td>` +
        `<td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">€${i.totalPrice.toLocaleString()}</td></tr>`
    )
    .join("");

  // Generate a unique accept token for this email
  const { randomBytes } = await import("crypto");
  const acceptToken = randomBytes(32).toString("hex");
  // Guard against a localhost/unset URL leaking into public email links.
  const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  const baseUrl =
    rawBaseUrl && !rawBaseUrl.includes("localhost") && !rawBaseUrl.includes("127.0.0.1")
      ? rawBaseUrl.replace(/\/$/, "")
      : "https://portal.mysccg.de";
  const acceptUrl = `${baseUrl}/api/offer-accept?token=${acceptToken}&action=accepted`;
  const rejectUrl = `${baseUrl}/api/offer-accept?token=${acceptToken}&action=rejected`;

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px;">
      <div style="text-align:center;padding:24px 0;border-bottom:2px solid #e5e7eb;margin-bottom:24px;">
        <h1 style="color:#1e40af;margin:0;font-size:24px;">Sales Offer</h1>
        <p style="color:#6b7280;margin:8px 0 0;font-size:14px;">${offer.offerNumber}</p>
      </div>
      <p>Dear <strong>${offer.clientName}</strong>,</p>
      <p>Please find below our offer details:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:left;">Product</th>
            <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:center;">Qty</th>
            <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;">Unit Price</th>
            <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <table style="width:100%;margin:16px 0;">
        <tr><td style="padding:4px;"><strong>Subtotal:</strong></td><td style="text-align:right;">€${offer.subtotal.toLocaleString()}</td></tr>
        ${offer.discount > 0 ? `<tr><td style="padding:4px;"><strong>Discount (${offer.discountType === "percent" ? offer.discount + "%" : "fixed"}):</strong></td><td style="text-align:right;">-€${(offer.subtotal - offer.totalAmount).toLocaleString()}</td></tr>` : ""}
        <tr style="font-size:1.2em;font-weight:bold;"><td style="padding:4px;">Total:</td><td style="text-align:right;color:#1e40af;">€${offer.totalAmount.toLocaleString()}</td></tr>
      </table>
      <p><strong>Valid until:</strong> ${new Date(offer.validUntil).toLocaleDateString()}</p>
      ${offer.notes ? `<p><strong>Notes:</strong> ${offer.notes}</p>` : ""}

      <!-- Accept / Reject buttons -->
      <div style="text-align:center;margin:32px 0;padding:24px;background:#f8fafc;border-radius:12px;">
        <p style="color:#374151;font-size:14px;margin:0 0 16px;">Do you accept this offer?</p>
        <a href="${acceptUrl}" style="display:inline-block;padding:12px 32px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;margin:0 8px;">
          ✓ Accept Offer
        </a>
        <a href="${rejectUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;margin:0 8px;">
          ✗ Decline
        </a>
      </div>

      <p>Best regards,<br/>${offer.partnerName || "Partner Portal"}</p>
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;"/>
      <p style="color:#9ca3af;font-size:12px;">This offer was generated by SCCG Partner Portal.</p>
    </div>`;

  // Track the email
  await createEmailTracking({
    salesOfferId: offer.id,
    offerNumber: offer.offerNumber,
    recipientEmail: offer.clientEmail,
    recipientName: offer.clientName,
    senderName: offer.partnerName || user.name,
    subject: `Service Offer from SCCG Career Lab Germany (Offer No: ${offer.offerNumber})`,
    status: "sent",
    sentAt: new Date().toISOString(),
    acceptToken,
    createdAt: new Date().toISOString(),
  });

  const result = await sendClientEmail({
    recipientEmail: offer.clientEmail,
    recipientName: offer.clientName || "",
    subject: `Service Offer from SCCG Career Lab Germany (Offer No: ${offer.offerNumber})`,
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
  try {
    const user = await requireUser();
    const order = await getSalesOrderById(orderId);
    if (!order) return { success: false, message: "Order not found" };
    if (!canAccessRecord(user, order)) return { success: false, message: "Forbidden: You do not have permission to modify this order" };

    const needsMarketplaceVerification = isPendingMarketplacePaymentVerification(order.notes);
    if (needsMarketplaceVerification && (status === "in-progress" || status === "completed")) {
      if (!isAdministrativeUser(user)) {
        return { success: false, message: "Only admin and operation staff can verify this marketplace payment." };
      }
      await confirmMarketplacePaymentAndActivateServices(order);
    }

    const nowIso = new Date().toISOString();
    let updatedNotes = needsMarketplaceVerification ? markMarketplacePaymentVerified(order.notes, user.name) : (order.notes || "");
    if (status === "completed" && !updatedNotes.includes("Completed at:")) {
      updatedNotes = updatedNotes ? `${updatedNotes}\nCompleted at: ${nowIso}` : `Completed at: ${nowIso}`;
    }

    const updates: Partial<typeof order> = {
      status,
      notes: updatedNotes,
    };
    if (status === "completed") updates.completedAt = nowIso;

    await updateSalesOrder(orderId, updates);
    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error in updateOrderStatusAction:", err);
    return { success: false, message: err?.message || "Failed to update order status" };
  }
}

export async function assignExpertToOrderAction(data: {
  orderId: string;
  expertName: string;
  expertEmail?: string;
  expertSpecialization?: string;
}) {
  try {
    const user = await requireUser();
    if (!isAdministrativeUser(user)) {
      return { success: false, message: "Unauthorized: Administrative role required to assign experts." };
    }
    const order = await getSalesOrderById(data.orderId);
    if (!order) return { success: false, message: "Order not found" };

    const now = new Date().toISOString();
    const expertLine = `Assigned Expert: ${data.expertName}${data.expertEmail ? ` (${data.expertEmail})` : ""}${data.expertSpecialization ? ` - ${data.expertSpecialization}` : ""}`;
    
    // Replace existing Assigned Expert line if present, else prepend
    const notesLines = (order.notes || "").split("\n");
    const filtered = notesLines.filter(l => !l.startsWith("Assigned Expert:"));
    const updatedNotes = `${expertLine}\n${filtered.join("\n")}`.trim();

    await updateSalesOrder(data.orderId, {
      notes: updatedNotes,
    });

    // Also create or ensure a service delivery task exists for this expert
    try {
      const existingTasks = await getServiceTasks(data.orderId);
      const existingForExpert = existingTasks.find(t => t.assignedTo?.toLowerCase() === data.expertName.toLowerCase());
      if (!existingForExpert) {
        await createServiceTask({
          salesOrderId: data.orderId,
          orderNumber: order.orderNumber,
          title: `Service Delivery: ${order.clientName || "Client"}`,
          description: `Deliver ordered services for ${order.clientName || "Client"} (${order.clientEmail || ""})`,
          assignedTo: data.expertName,
          status: "in-progress",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          createdAt: now,
        });
      }
    } catch (taskErr) {
      console.warn("Could not auto-create service task for expert:", taskErr);
    }

    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${data.orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${data.orderId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error in assignExpertToOrderAction:", err);
    return { success: false, message: err?.message || "Failed to assign expert" };
  }
}

export async function updateSalesOrderFullAction(data: {
  orderId: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  clientName?: string;
  clientEmail?: string;
  notes?: string;
  assignedExpert?: string;
}) {
  try {
    const user = await requireUser();
    const order = await getSalesOrderById(data.orderId);
    if (!order) return { success: false, message: "Order not found" };

    if (!isAdministrativeUser(user) && order.createdBy !== user.id && order.partnerId !== user.partnerId) {
      return { success: false, message: "Unauthorized: Insufficient permissions to edit this order." };
    }

    let updatedNotes = data.notes || "";
    if (data.assignedExpert && !updatedNotes.includes(`Assigned Expert: ${data.assignedExpert}`)) {
      const lines = updatedNotes.split("\n").filter(l => !l.startsWith("Assigned Expert:"));
      updatedNotes = `Assigned Expert: ${data.assignedExpert}\n${lines.join("\n")}`.trim();
    }

    const nowIso = new Date().toISOString();
    if (data.status === "completed" && !order.completedAt && !updatedNotes.includes("Completed at:")) {
      updatedNotes = updatedNotes ? `${updatedNotes}\nCompleted at: ${nowIso}` : `Completed at: ${nowIso}`;
    }

    const updates: Partial<typeof order> = {
      status: data.status,
      clientName: data.clientName?.trim() || order.clientName,
      clientEmail: data.clientEmail?.trim() || order.clientEmail,
      notes: updatedNotes,
    };
    if (data.status === "completed" && !order.completedAt) {
      updates.completedAt = nowIso;
    }

    await updateSalesOrder(data.orderId, updates);

    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${data.orderId}`);
    revalidatePath(`/sales/orders/${data.orderId}/edit`);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${data.orderId}`);
    revalidatePath(`/admin/orders/${data.orderId}/edit`);

    return { success: true };
  } catch (err: any) {
    console.error("Error in updateSalesOrderFullAction:", err);
    return { success: false, message: err?.message || "Failed to update order" };
  }
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
  if (!canAccessRecord(user, order)) return { success: false, message: "Forbidden" };

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
  if (!canAccessRecord(user, offer)) return null;
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
  if (!canAccessRecord(user, order)) return null;
  return { order, items, tasks, user };
}
