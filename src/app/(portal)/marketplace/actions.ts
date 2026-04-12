"use server";

import { auth } from "@/auth";
import type { SessionUser, SalesOrder, SalesOrderItem, Invoice, Transaction, ServicePackage, CustomerPackage } from "@/types";
import { 
  createSalesOrder, createSalesOrderItem, createInvoice, createTransaction, 
  generateOrderNumber, generateInvoiceNumber, getProducts,
  createCustomerPackage
} from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function createDirectOrderAction(data: {
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  reference?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;

  const orderNumber = await generateOrderNumber();
  const invoiceNumber = await generateInvoiceNumber();
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalAmount = subtotal; // Simpler for marketplace direct buy
  const now = new Date().toISOString();

  // 1. Create the Sales Order directly in "pending" or "confirmed" status
  const order = await createSalesOrder({
    orderNumber,
    salesOfferId: "DIRECT_BUY", // Indicator for marketplace direct buy
    offerNumber: "N/A",
    partnerId: user.partnerId || user.id,
    partnerName: user.name,
    clientId: user.id, // Direct buy usually for self or managed client
    clientName: data.customerName,
    clientEmail: data.customerEmail,
    status: "pending",
    totalAmount,
    notes: data.notes || `Direct purchase with reference: ${data.reference || "none"}`,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Create Order Line Items
  for (const item of data.items) {
    await createSalesOrderItem({
      salesOrderId: order.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    });
  }

  // 3. Create a PAID Invoice immediately
  const invoice = await createInvoice({
    partnerId: user.partnerId || user.id,
    clientId: user.id,
    clientName: data.customerName,
    orderId: order.id,
    amount: totalAmount,
    status: "paid", // Automatically marked as paid as requested
    dueDate: now,
    createdAt: now,
  });

  // 4. Create the Transaction record (Payment)
  await createTransaction({
    clientId: user.id,
    partnerId: user.partnerId || user.id,
    type: "payment",
    amount: totalAmount,
    reference: data.reference || `Direct-Order-${orderNumber}`,
    orderId: order.id,
    description: `Marketplace Direct Payment for Order ${orderNumber}`,
    date: now,
  });

  // 5. Logic for Service Packages (If applicable)
  // Here we check if any items are service packages and create CustomerPackage entries
  const products = await getProducts();
  for (const item of data.items) {
    const product = products.find(p => p.id === item.productId);
    if (product && (product.category === "service" || product.unit === "Package")) {
      await createCustomerPackage({
        customerId: user.id,
        customerName: data.customerName,
        partnerId: user.partnerId || user.id,
        servicePackageId: product.id,
        packageName: product.name,
        orderId: order.id,
        totalSessions: product.sessionsCount || 1,
        completedSessions: 0,
        totalAmount: item.quantity * item.unitPrice,
        amountPaid: item.quantity * item.unitPrice,
        startDate: now,
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year validity default
        status: "active",
        createdAt: now,
      });
    }
  }

  revalidatePath("/orders");
  revalidatePath("/financials/invoices");
  
  return { success: true, orderId: order.id, orderNumber };
}
