"use server";

import {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  getActivePaymentMethods,
  getEnhancedInvoices,
  createEnhancedInvoice,
  updateEnhancedInvoice,
  getEnhancedInstallments,
  updateEnhancedInstallment,
  getInstallmentRules,
} from "@/lib/firestore-services";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import type { PaymentMethod, PaymentStatus, EnhancedInvoiceStatus, InvoiceType } from "@/types";

// ── Payments ──

export async function fetchPayments(filters?: { clientId?: string; status?: string; method?: string }) {
  await requirePermission("payment.view");
  return getPayments(filters);
}

export async function fetchPaymentById(id: string) {
  await requirePermission("payment.view");
  return getPaymentById(id);
}

export async function recordPayment(data: {
  clientId: string;
  clientName: string;
  amount: number;
  currency: "BDT" | "EUR";
  method: PaymentMethod;
  context: string;
  referenceId?: string;
  invoiceId?: string;
  installmentId?: string;
  notes?: string;
  transactionRef?: string;
}) {
  const user = await requirePermission("payment.record");

  const payment = await createPayment({
    payerUserId: data.clientId,
    payerName: data.clientName,
    payerEmail: "no-email@sccg.com", // Should be fetched from client record if available
    amount: data.amount,
    currency: data.currency,
    paymentMethod: data.method,
    paymentMethodName: data.method.replace(/-/g, " ").toUpperCase(),
    paymentContext: data.context as any,
    referenceId: data.referenceId,
    invoiceId: data.invoiceId,
    installmentId: data.installmentId,
    transactionReference: data.transactionRef,
    status: "verified",
    verifiedByUserId: user.id,
    verifiedByName: user.name,
    verifiedAt: new Date().toISOString(),
  } as any);

  // If payment is against an installment, mark it
  if (data.installmentId) {
    await updateEnhancedInstallment(data.installmentId, {
      status: "paid",
      amountPaid: data.amount,
      paidDate: new Date().toISOString(),
      paymentId: payment.id,
    });
  }

  await writeAuditLog({
    action: "payment.recorded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: payment.id,
    targetType: "payment",
    after: { amount: data.amount, method: data.method, clientName: data.clientName },
  });

  return payment;
}

export async function refundPayment(id: string, reason: string) {
  const user = await requirePermission("payment.refund");
  await updatePayment(id, { status: "refunded", rejectionReason: reason, verifiedByUserId: user.id, verifiedAt: new Date().toISOString() });

  await writeAuditLog({
    action: "payment.refunded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "payment",
    metadata: { reason },
  });
}

export async function fetchPaymentMethods() {
  await requirePermission("payment.view");
  return getActivePaymentMethods();
}

// ── Invoices ──

export async function fetchInvoices(filters?: { clientId?: string; status?: string; type?: string }) {
  await requirePermission("invoice.view");
  return getEnhancedInvoices(filters);
}

export async function createNewInvoice(data: {
  invoiceType: InvoiceType;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
  currency: "BDT" | "EUR";
  dueDate: string;
  notes?: string;
  relatedOrderId?: string;
}) {
  const user = await requirePermission("invoice.create");

  const invoice = await createEnhancedInvoice({
    ...data,
    status: "draft",
    createdBy: user.id,
  });

  await writeAuditLog({
    action: "invoice.created",
    actorId: user.id,
    actorEmail: user.email,
    targetId: invoice.id,
    targetType: "invoice",
    after: { invoiceNumber: invoice.invoiceNumber, amount: data.amount, clientName: data.clientName },
  });

  return invoice;
}

export async function updateInvoiceStatus(id: string, status: EnhancedInvoiceStatus) {
  const user = await requirePermission("invoice.manage");
  await updateEnhancedInvoice(id, { status });

  await writeAuditLog({
    action: "invoice.status.changed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "invoice",
    after: { status },
  });
}

// ── Installments ──

export async function fetchInstallments(filters?: { clientId?: string; status?: string; relatedEntityId?: string }) {
  await requirePermission("installment.view");
  return getEnhancedInstallments(filters);
}

export async function fetchInstallmentRules() {
  await requirePermission("installment.view");
  return getInstallmentRules();
}

export async function markInstallmentPaid(id: string, paymentId: string, amount: number) {
  const user = await requirePermission("installment.manage");
  await updateEnhancedInstallment(id, {
    status: "paid",
    amountPaid: amount,
    paidDate: new Date().toISOString(),
    paymentId,
  });

  await writeAuditLog({
    action: "installment.paid",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "installment",
    after: { paymentId, amount },
  });
}
