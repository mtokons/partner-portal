"use server";

/**
 * Central server-actions for RowActions (Delete + Hold) across all entity types.
 * Each function returns { ok, error? } so RowActions can handle the result.
 */

import {
  deletePartner, togglePartnerHold,
  deletePayout, togglePayoutHold,
  deleteReferral, toggleReferralHold,
  deleteExpertPayment, toggleExpertPaymentHold,
  deleteExpense, toggleExpenseHold,
  deleteInvoice, toggleInvoiceHold,
  deleteCustomer, toggleCustomerHold,
  deleteSession, toggleSessionHold,
  deleteClient, updateClient,
  deleteOrder, toggleOrderHold,
  deleteSalesOrderRecord, toggleSalesOrderHold,
  deletePromoCode, updatePromoCode,
  deletePromotion, updatePromotion,
  deleteProduct, toggleProductHold,
  deleteSalesOffer, updateSalesOffer,
} from "@/lib/sharepoint";

type Res = { ok: boolean; error?: string };

function wrap(fn: () => Promise<void>): Promise<Res> {
  return fn().then(() => ({ ok: true })).catch((e: unknown) => ({
    ok: false,
    error: e instanceof Error ? e.message : String(e),
  }));
}

// Partners
export const removePartner = async (id: string) => wrap(() => deletePartner(id));
export const holdPartner   = async (id: string, hold: boolean) => wrap(() => togglePartnerHold(id, hold));

// Payouts
export const removePayout = async (id: string) => wrap(() => deletePayout(id));
export const holdPayout   = async (id: string, hold: boolean) => wrap(() => togglePayoutHold(id, hold));

// Referrals
export const removeReferral = async (id: string) => wrap(() => deleteReferral(id));
export const holdReferral   = async (id: string, hold: boolean) => wrap(() => toggleReferralHold(id, hold));

// Expert Payments
export const removeExpertPayment = async (id: string) => wrap(() => deleteExpertPayment(id));
export const holdExpertPayment   = async (id: string, hold: boolean) => wrap(() => toggleExpertPaymentHold(id, hold));

// Expenses
export const removeExpense = async (id: string) => wrap(() => deleteExpense(id));
export const holdExpense   = async (id: string, hold: boolean) => wrap(() => toggleExpenseHold(id, hold));

// Invoices (SharePoint / financials)
export const removeSPInvoice = async (id: string) => wrap(() => deleteInvoice(id));
export const holdSPInvoice   = async (id: string, hold: boolean) => wrap(() => toggleInvoiceHold(id, hold));

// Customers
export const removeCustomer = async (id: string) => wrap(() => deleteCustomer(id));
export const holdCustomer   = async (id: string, hold: boolean) => wrap(() => toggleCustomerHold(id, hold));

// Sessions
export const removeSession = async (id: string) => wrap(() => deleteSession(id));
export const holdSession   = async (id: string, hold: boolean) => wrap(() => toggleSessionHold(id, hold));

// Clients
export const removeClientRecord = async (id: string) => wrap(() => deleteClient(id));
export const holdClientRecord   = async (id: string, hold: boolean) => wrap(() => updateClient(id, { isOnHold: hold }));

// Orders
export const removeOrderRecord = async (id: string) => wrap(() => deleteOrder(id));
export const holdOrderRecord   = async (id: string, hold: boolean) => wrap(() => toggleOrderHold(id, hold));

// Sales Orders
export const removeSalesOrder = async (id: string) => wrap(() => deleteSalesOrderRecord(id));
export const holdSalesOrder   = async (id: string, hold: boolean) => wrap(() => toggleSalesOrderHold(id, hold));

// Promo Codes
export const removePromoCode = async (id: string) => wrap(() => deletePromoCode(id));
export const holdPromoCode   = async (id: string, hold: boolean) => wrap(() => updatePromoCode(id, { status: hold ? "revoked" : "active" }));

// Promotions
export const removePromotion = async (id: string) => wrap(() => deletePromotion(id));
export const holdPromotion   = async (id: string, hold: boolean) => wrap(() => updatePromotion(id, { isActive: !hold }));

// Products
export const removeProduct = async (id: string) => wrap(() => deleteProduct(id));
export const holdProduct   = async (id: string, hold: boolean) => wrap(() => toggleProductHold(id, hold));

// Sales Offers
export const removeSalesOffer = async (id: string) => wrap(() => deleteSalesOffer(id));
export const holdSalesOffer   = async (id: string, hold: boolean) => wrap(() => updateSalesOffer(id, { isOnHold: hold }));
