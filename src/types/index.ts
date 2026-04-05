// ============================================================
// B2B Partner Portal — Data Models (map to SharePoint lists)
// ============================================================

export type UserRole = "partner" | "admin" | "customer" | "expert";
export type PartnerStatus = "pending" | "active" | "suspended";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type InstallmentStatus = "upcoming" | "paid" | "overdue";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type TransactionType = "purchase" | "payment" | "refund";
export type ActivityType = "order" | "client" | "payment" | "installment" | "login" | "expense" | "invoice";

export interface Partner {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: PartnerStatus;
  company: string;
  phone?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  // Sales Shop extensions
  discount?: number;             // Discount value
  discountType?: "fixed" | "percent";
  discountExpiry?: string;       // ISO date
  isAvailable?: boolean;         // If false, hidden in shop
  tags?: string[];               // e.g. ["new", "bestseller"]
  sortOrder?: number;            // Gallery display order
}

export interface Order {
  id: string;
  partnerId: string;
  clientId: string;
  clientName?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  /** Equivalent total in EUR (optional, computed from BDT) */
  totalAmountEur?: number;
  /** Conversion rate used to compute EUR (BDT -> EUR) */
  conversionRate?: number;
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Client {
  id: string;
  partnerId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  partnerId: string;
  type: ActivityType;
  description: string;
  relatedId?: string;
  createdAt: string;
}

export interface Financial {
  id: string;
  partnerId: string;
  period: string; // e.g. "2026-03"
  revenue: number;
  outstanding: number;
  paid: number;
  createdAt: string;
}

export interface Installment {
  id: string;
  orderId: string;
  clientId: string;
  clientName?: string;
  partnerId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  amountEur?: number;
  conversionRate?: number;
  dueDate: string;
  paidDate?: string;
  status: InstallmentStatus;
  notes?: string;
}

export interface Transaction {
  id: string;
  clientId: string;
  partnerId: string;
  type: TransactionType;
  amount: number;
  /** Equivalent amount in EUR (optional, computed from BDT) */
  amountEur?: number;
  /** Conversion rate used (BDT -> EUR) */
  conversionRate?: number;
  reference: string;
  orderId?: string;
  description?: string;
  date: string;
}

export interface Expense {
  id: string;
  partnerId: string;
  category: string;
  amount: number;
  amountEur?: number;
  conversionRate?: number;
  description: string;
  date: string;
}

export interface Invoice {
  id: string;
  partnerId: string;
  clientId: string;
  clientName?: string;
  orderId?: string;
  amount: number;
  /** Equivalent amount in EUR (optional, computed from BDT) */
  amountEur?: number;
  /** Conversion rate used (BDT -> EUR) */
  conversionRate?: number;
  status: InvoiceStatus;
  dueDate: string;
  pdfUrl?: string;
  createdAt: string;
}

// Dashboard KPI types
export interface DashboardKPIs {
  totalSales: number;
  activeClients: number;
  pendingOrders: number;
  totalRevenue: number;
  overdueInstallments: number;
  unpaidInvoices: number;
}

export interface ProfitLoss {
  period: string;
  income: number;
  expenses: number;
  profit: number;
}

// NextAuth session extension
export interface SessionUser {
  amountEur?: number;
  conversionRate?: number;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  partnerId: string;
  company: string;
  /** Set when role is "customer" */
  customerId?: string;
  /** Set when role is "expert" */
  expertId?: string;
}

// ============================================================
// Customer Portal Types
// ============================================================

export type CustomerStatus = "active" | "inactive" | "suspended";
export type CustomerPackageStatus = "active" | "completed" | "expired" | "cancelled";
export type SessionStatus = "pending" | "scheduled" | "completed" | "cancelled" | "rescheduled";
export type ExpertStatus = "active" | "inactive" | "on-leave";
export type ExpertPaymentStatus = "pending" | "eligible" | "approved" | "paid" | "disputed";
export type NotificationType =
  | "payment_due"
  | "payment_received"
  | "session_scheduled"
  | "session_completed"
  | "session_reminder"
  | "expert_assigned"
  | "payment_eligible"
  | "payment_approved"
  | "general";

export interface Customer {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  company?: string;
  /** The partner who manages this customer */
  partnerId: string;
  status: CustomerStatus;
  createdAt: string;
}

/** A product definition that includes session-based service delivery */
export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  totalSessions: number;
  sessionDurationMinutes: number;
  /** Days from purchase date until package expires */
  validityDays: number;
  price: number;
  category: string;
}

/** A customer's purchased package instance */
export interface CustomerPackage {
  id: string;
  customerId: string;
  customerName?: string;
  partnerId: string;
  servicePackageId: string;
  packageName: string;
  orderId?: string;
  totalSessions: number;
  completedSessions: number;
  totalAmount: number;
  amountPaid: number;
  startDate: string;
  endDate: string;
  status: CustomerPackageStatus;
  expertId?: string;
  expertName?: string;
  createdAt: string;
}

export interface Expert {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  specialization: string;
  bio?: string;
  status: ExpertStatus;
  rating: number; // 1.0–5.0
  totalSessionsCompleted: number;
  /** EUR paid to expert per completed session */
  ratePerSession: number;
  createdAt: string;
}

/** An individual service session tied to a CustomerPackage */
export interface Session {
  id: string;
  customerPackageId: string;
  customerId: string;
  customerName?: string;
  expertId?: string;
  expertName?: string;
  partnerId: string;
  sessionNumber: number;
  totalSessions: number;
  scheduledAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  status: SessionStatus;
  notes?: string;
  expertNotes?: string;
  customerRating?: number; // 1–5
  createdAt: string;
}

/** Payment record for an expert after completing a session */
export interface ExpertPayment {
  id: string;
  expertId: string;
  expertName?: string;
  sessionId: string;
  customerId: string;
  customerName?: string;
  partnerId: string;
  amount: number;
  amountEur?: number;
  conversionRate?: number;
  status: ExpertPaymentStatus;
  eligibleAt?: string;
  approvedAt?: string;
  paidAt?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

/** In-app notification for any user type */
export interface AppNotification {
  id: string;
  userId: string;
  userType: "customer" | "expert" | "partner" | "admin";
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
  createdAt: string;
}

/** Aggregated session statistics for dashboard KPI cards */
export interface SessionStats {
  total: number;
  completed: number;
  scheduled: number;
  pending: number;
  cancelled: number;
}

// ============================================================
// Sales Offers & Sales Orders Module
// ============================================================

export type SalesOfferStatus = "draft" | "sent" | "accepted" | "rejected";
export type SalesOrderStatus = "pending" | "in-progress" | "completed" | "cancelled";
export type ServiceTaskStatus = "planned" | "in-progress" | "completed" | "cancelled";

/** Sales Offer header — stored in SharePoint list "SalesOffers" */
export interface SalesOffer {
  id: string;
  offerNumber: string;          // Unique, e.g. "SO-2026-00001"
  partnerId: string;
  partnerName?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  status: SalesOfferStatus;
  saleType: SaleType;           // NEW — how this sale is classified
  referralId?: string;          // NEW — referrer's user ID
  referralName?: string;        // NEW — referrer's display name
  referralPercent?: number;     // NEW — % benefit for referrer (0-100)
  subtotal: number;             // Sum of line totals (BDT)
  discount: number;             // Discount amount or percentage value
  discountType: "fixed" | "percent";
  totalAmount: number;          // Final total after discount
  validUntil: string;           // ISO date
  notes?: string;
  createdBy: string;            // partnerId or admin id
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  /** Reference to the Sales Order created from this offer */
  salesOrderId?: string;
}

/** Sales Offer line item — stored in SharePoint list "SalesOfferItems" */
export interface SalesOfferItem {
  id: string;
  salesOfferId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;            // BDT
  totalPrice: number;           // quantity * unitPrice
}

/** Sales Order header — stored in SharePoint list "SalesOrders" */
export interface SalesOrder {
  id: string;
  orderNumber: string;          // Unique, e.g. "ORD-2026-00001"
  salesOfferId: string;         // Reference to the originating offer
  offerNumber: string;
  partnerId: string;
  partnerName?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  status: SalesOrderStatus;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** Sales Order line item — stored in SharePoint list "SalesOrderItems" */
export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Service task linked to a Sales Order — stored in SharePoint list "ServiceTasks" */
export interface ServiceTask {
  id: string;
  salesOrderId: string;
  orderNumber?: string;
  title: string;
  description?: string;
  assignedTo?: string;          // expert or partner name
  status: ServiceTaskStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

// ============================================================
// SCCG Sales Shop — Extended Types
// ============================================================

/** The four B2B sale channels */
export type SaleType =
  | "direct"                   // SCCG sells directly, 100% to SCCG
  | "direct-referral"          // Direct plus a referrer who earns a %
  | "partner-individual"       // Individual partner sale with commission
  | "partner-institutional";   // Institutional partner (e.g. reseller)

/** Referral record — stored in SharePoint "SCCG Referrals" */
export interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerType: "partner" | "expert" | "user";
  salesOfferId: string;
  salesOrderId?: string;       // set when offer converts to order
  percentage: number;          // 0–100
  amount: number;              // calculated payout amount
  status: "pending" | "approved" | "paid";
  createdAt: string;
}

/** Payout record — stored in SharePoint "SCCG Payouts" */
export type PayoutStatus = "pending" | "eligible" | "approved" | "paid";
export type PayoutRecipientType = "partner" | "expert" | "referrer";

export interface Payout {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientType: PayoutRecipientType;
  relatedOrderId: string;
  relatedOrderNumber?: string;
  gross: number;
  deductions: number;
  net: number;
  currency: "BDT" | "EUR";
  status: PayoutStatus;
  payoutDate?: string;
  notes?: string;
  createdAt: string;
}

/** Promotion / campaign — stored in SharePoint "SCCG Promotions" */
export type PromotionType = "discount" | "bundle" | "promo" | "announcement";
export type PromotionAppliesTo = "all" | "product" | "category";

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  type: PromotionType;
  appliesTo: PromotionAppliesTo;
  productId?: string;          // if promotion is product-specific
  category?: string;           // if promotion is category-specific
  discountType: "fixed" | "percent";
  discountValue: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  imageUrl?: string;           // image for the slider
  priority: number;            // display order in slider
}

/** Cart item — client-side only, no SharePoint list */
export interface CartItem {
  product: Product;
  quantity: number;
  effectivePrice: number;      // price after active promotion/discount
  appliedPromotion?: Promotion; // which promotion was applied, if any
}
