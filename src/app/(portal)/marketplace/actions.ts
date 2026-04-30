"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { 
  createSalesOrder, createSalesOrderItem, createInvoice, createTransaction, 
  generateOrderNumber, getProducts,
  createCustomerPackage, createGiftCard, generateGiftCardNumber,
  getCoinWallet, updateCoinWallet, createCoinTransaction
} from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function createDirectOrderAction(data: {
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  reference?: string;
  notes?: string;
  paymentMethod?: "bangladesh-online" | "manual-transfer" | "coin";
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;

  const orderNumber = await generateOrderNumber();
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalAmount = subtotal; // Simpler for marketplace direct buy
  const now = new Date().toISOString();
  const paymentMethod = data.paymentMethod || "manual-transfer";
  const isCoinPayment = paymentMethod === "coin";
  const trimmedReference = data.reference?.trim();

  if (!isCoinPayment && !trimmedReference) {
    throw new Error("Please provide your payment transaction reference.");
  }

  // 0. Handle Payment Method logic (Coins)
  if (isCoinPayment) {
    const wallet = await getCoinWallet(user.id);
    if (!wallet) throw new Error("No SCCG Coin wallet found for this user.");
    if (wallet.balance < totalAmount) {
      throw new Error(`Insufficient balance. You have ${wallet.balance} SCCG Coins, but the order total is ${totalAmount}.`);
    }

    // Debit the wallet
    await createCoinTransaction({
      walletId: user.id,
      userId: user.id,
      transactionType: "spend-purchase",
      amount: totalAmount,
      runningBalance: wallet.balance - totalAmount,
      description: `Payment for Marketplace Order ${orderNumber}`,
      createdAt: now,
      createdBy: user.id,
    });

    await updateCoinWallet(user.id, {
      balance: wallet.balance - totalAmount,
      totalSpent: (wallet.totalSpent || 0) + totalAmount,
    });
  }

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
    notes: [
      data.notes || "Checkout from SCCG Marketplace",
      `Marketplace payment method: ${paymentMethod}`,
      `Payment reference: ${trimmedReference || "N/A"}`,
      `Payment verification: ${isCoinPayment ? "verified" : "pending-admin-verification"}`,
      `Payment submitted at: ${now}`,
    ].join("\n"),
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

  if (isCoinPayment) {
    // 3. Create a PAID Invoice immediately
    await createInvoice({
      partnerId: user.partnerId || user.id,
      clientId: user.id,
      clientName: data.customerName,
      orderId: order.id,
      amount: totalAmount,
      status: "paid",
      dueDate: now,
      createdAt: now,
    });

    // 4. Create the Transaction record (Payment)
    await createTransaction({
      clientId: user.id,
      partnerId: user.partnerId || user.id,
      type: "payment",
      amount: totalAmount,
      reference: trimmedReference || `Direct-Order-${orderNumber}`,
      orderId: order.id,
      description: `Marketplace Coin Payment for Order ${orderNumber}`,
      date: now,
    });

    // 5. Logic for Service Packages (If applicable)
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
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          createdAt: now,
        });
      }

      // 6. Logic for Gift Cards (Auto-issuance)
      if (product && product.category === "Gift Card") {
        for (let q = 0; q < item.quantity; q++) {
          const { hash: __pinHash } = (await import("@/lib/pin")).generateGiftCardPinWithHash(4);
          await createGiftCard({
            sccgId: `GC-${orderNumber}-${q + 1}`,
            cardNumber: generateGiftCardNumber(),
            pinHash: __pinHash,
            pinAttempts: 0,
            issuedToUserId: user.id,
            issuedToName: data.customerName,
            issuedToEmail: data.customerEmail,
            issuedByUserId: user.id,
            issuedBy: user.name,
            initialBalance: item.unitPrice,
            currentBalance: item.unitPrice,
            balance: item.unitPrice,
            currency: "BDT",
            tier: "standard",
            status: "active",
            designTemplate: "standard",
            notes: `Purchased via Order ${orderNumber}`,
            activatedAt: now,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            issuedAt: now,
            createdAt: now,
          });
        }
      }
    }
  }

  revalidatePath("/orders");
  revalidatePath("/financials/invoices");
  
  return {
    success: true,
    orderId: order.id,
    orderNumber,
    requiresVerification: !isCoinPayment,
    paymentMethod,
  };
}
