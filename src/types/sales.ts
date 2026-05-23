// ─── Sales Types ───

export type SalesOfferStatus = "draft" | "sent" | "accepted" | "rejected";
export type SalesOrderStatus = "pending" | "in-progress" | "completed" | "cancelled";

export interface SalesOfferItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesOffer {
  id: string;
  offerNumber: string;
  partnerId: string;
  partnerName?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  items: SalesOfferItem[];
  subtotal: number;
  discount: number;
  discountType: "fixed" | "percent";
  totalAmount: number;
  status: SalesOfferStatus;
  validUntil: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  salesOfferId: string;
  offerNumber: string;
  partnerId: string;
  partnerName?: string;
  clientId: string;
  clientName?: string;
  totalAmount: number;
  status: SalesOrderStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}
