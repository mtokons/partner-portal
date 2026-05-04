// ============================================================
// B2B Partner Portal — Data Models (map to SharePoint lists)
// ============================================================

export type UserRole = "partner" | "admin" | "customer" | "expert" | "student";
export type PartnerType = "individual" | "institutional";
export type PartnerStatus = "pending" | "active" | "suspended";
export type PartnerOnboardingStatus = "application" | "review" | "approved" | "rejected";
export type CommissionTier = "standard" | "premium" | "enterprise";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type InstallmentStatus = "upcoming" | "paid" | "overdue";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type TransactionType = "purchase" | "payment" | "refund";
export type ActivityType = "order" | "client" | "payment" | "installment" | "login" | "expense" | "invoice";

export interface Partner {
  id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: PartnerStatus;
  company: string;
  phone?: string;
  partnerType: PartnerType;
  partnerCode?: string;
  commissionTier: CommissionTier;
  taxId?: string;
  legalEntityName?: string;
  onboardingStatus: PartnerOnboardingStatus;
  approvedBy?: string;
  approvedAt?: string;
  isOnHold?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;                    // Unique ID number
  sku: string;                   // Stock Keeping Unit
  name: string;
  description: string;           // Detailed description
  unit: "Package" | "Session" | "Course" | "Card"; // The type of delivery
  sessionsCount: number;         // Expert session amount
  retailPriceEur: number;        // SCCG Retail Price in EUR
  retailPriceBdt: number;        // SCCG Retail Price in BDT
  
  // Base B2B reference pricing/stock
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
  isOnHold?: boolean;
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
  updatedAt?: string;
  isOnHold?: boolean;
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
  updatedAt?: string;
  isOnHold?: boolean;
}

export interface Activity {
  id: string;
  partnerId: string;
  clientId?: string;
  type: ActivityType;
  title?: string;
  description: string;
  date?: string;
  createdBy?: string;
  relatedId?: string;
  createdAt?: string;
}

export interface Financial {
  id: string;
  partnerId: string;
  period: string; // e.g. "2026-03"
  revenue: number;
  outstanding: number;
  paid: number;
  createdAt: string;
  updatedAt?: string;
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
  isOnHold?: boolean;
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
  updatedAt?: string;
  isOnHold?: boolean;
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
  /** Primary role for routing — kept for backward compat */
  role: UserRole;
  /** All active roles — multi-role support */
  roles: string[];
  partnerId: string;
  company: string;
  customerId?: string;
  expertId?: string;
  partnerType?: PartnerType;
  coinBalance?: number;
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
  passwordHash?: string;
  phone?: string;
  company?: string;
  /** The partner who manages this customer */
  partnerId: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt?: string;
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
  updatedAt?: string;
}

export interface Expert {
  id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  specialization: string;
  bio?: string;
  status: ExpertStatus;
  rating: number; // 1.0–5.0
  totalSessionsCompleted: number;
  /** EUR paid to expert per completed session */
  ratePerSession: number;
  createdAt: string;
  updatedAt?: string;
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
  isOnHold?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  currency: string;
  amountEur?: number;
  conversionRate?: number;
  status: ExpertPaymentStatus;
  eligibleAt?: string;
  approvedAt?: string;
  paidAt?: string;
  approvedBy?: string;
  notes?: string;
  isOnHold?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  updatedAt?: string;
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
  updatedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  /** Reference to the Sales Order created from this offer */
  salesOrderId?: string;
  // Promo/commission integration
  promoCodeId?: string;
  promoCodeValue?: string;
  promoDiscountAmount?: number;
  attributedPartnerId?: string;
  attributedPartnerType?: PartnerType;
  commissionRuleId?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  sccgCoinUsed?: number;
  giftCardId?: string;
  giftCardAmountUsed?: number;
  isOnHold?: boolean;
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
  updatedAt?: string;
  completedAt?: string;
  // Promo/commission integration (copied from offer)
  promoCodeId?: string;
  promoCodeValue?: string;
  promoDiscountAmount?: number;
  attributedPartnerId?: string;
  attributedPartnerType?: PartnerType;
  commissionRuleId?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  commissionStatus?: "pending" | "posted" | "settled" | "reversed";
  sccgCoinUsed?: number;
  giftCardId?: string;
  giftCardAmountUsed?: number;
  settledAt?: string;
  isOnHold?: boolean;
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
  updatedAt?: string;
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
  isOnHold?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  isOnHold?: boolean;
  createdAt: string;
  updatedAt?: string;
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

// ============================================================
// Email Tracking & Offer Acceptance
// ============================================================

export type EmailStatus = "queued" | "sent" | "delivered" | "opened" | "failed";

/** Tracks every email sent from the platform — stored in "EmailTracking" */
export interface EmailTracking {
  id: string;
  salesOfferId?: string;
  offerNumber?: string;
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  subject: string;
  status: EmailStatus;
  sentAt: string;
  openedAt?: string;
  /** Unique token embedded in the accept link */
  acceptToken?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AcceptanceAction = "accepted" | "rejected" | "viewed";

/** Logs when a client clicks Accept/Reject in a sales offer email */
export interface OfferAcceptanceLog {
  id: string;
  salesOfferId: string;
  offerNumber: string;
  acceptToken: string;
  clientEmail: string;
  action: AcceptanceAction;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ============================================================
// User Profiles (SharePoint mirror of Firebase users)
// ============================================================

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: "partner" | "customer" | "expert" | "admin";
  company?: string;
  specialization?: string;
  status: "active" | "pending" | "suspended";
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Multi-Role System
// ============================================================

export type UserRoleType =
  | "admin"
  | "customer"
  | "partner"
  | "partner-individual"
  | "partner-institutional"
  | "expert"
  | "finance"
  | "hr"
  | "teacher"
  | "school-manager"
  | "student";

export type UserRoleStatus = "active" | "pending" | "suspended" | "revoked";

export interface UserRoleEntry {
  id: string;
  userAccountId: string;
  role: UserRoleType;
  status: UserRoleStatus;
  grantedAt: string;
  grantedBy: string;
  revokedAt?: string;
  notes?: string;
}

// ============================================================
// Promo Codes & Referrals
// ============================================================

export type PromoCodeType = "promo-general" | "referral-personal" | "referral-partner-individual" | "referral-partner-institutional";
export type PromoCodeStatus = "active" | "paused" | "expired" | "revoked";

export interface PromoCode {
  id: string;
  code: string;
  codeType: PromoCodeType;
  ownerId: string;
  ownerName: string;
  partnerProfileId?: string;
  discountType: "fixed" | "percent" | "none";
  discountValue: number;
  commissionRuleId?: string;
  maxUses: number;
  currentUses: number;
  maxUsesPerUser: number;
  minOrderAmount: number;
  applicableProducts?: string;
  applicableCategories?: string;
  validFrom: string;
  validUntil?: string;
  status: PromoCodeStatus;
  shareableLink: string;
  qrCodeData?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface PromoCodeUsage {
  id: string;
  promoCodeId: string;
  code: string;
  usedByUserId: string;
  usedByEmail: string;
  salesOfferId: string;
  salesOrderId?: string;
  discountApplied: number;
  commissionGenerated: number;
  usedAt: string;
}

// ============================================================
// Commission Engine
// ============================================================

export interface CommissionRule {
  id: string;
  name: string;
  codeType: PromoCodeType;
  partnerTier: CommissionTier | "any";
  productCategory: string;
  commissionPercent: number;
  minOrderAmount: number;
  maxCommission: number;
  isActive: boolean;
  priority: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CommissionLedgerType =
  | "commission-posted"
  | "commission-adjustment"
  | "commission-reversed"
  | "commission-settled"
  | "payout-requested"
  | "payout-approved"
  | "payout-completed";

export interface CommissionLedgerEntry {
  id: string;
  entryType: CommissionLedgerType;
  recipientId: string;
  recipientName: string;
  recipientType: string;
  salesOrderId?: string;
  orderNumber?: string;
  promoCodeId?: string;
  ruleId?: string;
  amount: number;
  currency: "BDT" | "EUR";
  runningBalance: number;
  description: string;
  relatedEntryId?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

// ============================================================
// SCCG Coin Wallet
// ============================================================

export type WalletStatus = "active" | "frozen" | "closed";

export interface CoinWallet {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  balance: number;
  currency: string;
  totalEarned: number;
  totalSpent: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt?: string;
}

export type CoinTransactionType =
  | "top-up"
  | "earn-commission"
  | "earn-referral"
  | "earn-refund"
  | "spend-purchase"
  | "spend-gift"
  | "adjustment-admin"
  | "expiry";

export interface CoinTransaction {
  id: string;
  walletId: string;
  userId: string;
  transactionType: CoinTransactionType;
  amount: number;
  runningBalance: number;
  referenceType?: string;
  referenceId?: string;
  description: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

// ============================================================
// SCCG Card (renamed from Gift Card)
// ============================================================

export type SccgCardStatus = "active" | "frozen" | "expired" | "depleted" | "cancelled";
export type SccgCardDesign = "standard" | "premium" | "birthday" | "corporate";

/** @deprecated Use SccgCard instead */
export type GiftCardStatus = SccgCardStatus;
/** @deprecated Use SccgCardDesign instead */
export type GiftCardDesign = SccgCardDesign;

export interface SccgCard {
  id: string;
  sccgId: string;
  cardNumber: string;
  pinHash: string;
  pinAttempts: number;
  clientId?: string;     // for B2B association
  clientName?: string;
  clientEmail?: string;
  issuedToUserId: string;
  issuedToName: string;
  issuedToEmail: string;
  issuedByUserId: string;
  issuedBy?: string;     // Display name of issuer
  initialBalance: number;
  currentBalance: number;
  balance: number;       // alias for currentBalance
  currency: "BDT" | "EUR";
  tier?: "standard" | "premium" | "platinum";
  status: SccgCardStatus;
  designTemplate: SccgCardDesign;
  notes?: string;
  activatedAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  frozenAt?: string;
  frozenReason?: string;
  reissuedFromCardId?: string;
  qrCodeData?: string;
  issuedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** @deprecated Use SccgCard instead */
export type GiftCard = SccgCard;

export type SccgCardTransactionType =
  | "activation"
  | "purchase-usage"
  | "top-up"
  | "refund"
  | "admin-adjustment"
  | "expiry-debit"
  | "load"
  | "redeem";

/** @deprecated Use SccgCardTransactionType instead */
export type GiftCardTransactionType = SccgCardTransactionType;

export interface SccgCardTransaction {
  id: string;
  sccgCardId: string;
  cardId?: string;        // alias for Firestore-based module
  giftCardId?: string;
  transactionType: SccgCardTransactionType;
  type?: SccgCardTransactionType; // alias for Firestore-based module
  amount: number;
  runningBalance: number;
  balanceAfter: number;   // alias for runningBalance
  salesOrderId?: string;
  referenceId?: string;
  currency?: "BDT" | "EUR";
  description: string;
  createdAt: string;
  updatedAt?: string;
  performedAt?: string;   // alias for createdAt
  createdBy: string;
  performedBy?: string;   // alias for createdBy
}

/** @deprecated Use SccgCardTransaction instead */
export type GiftCardTransaction = SccgCardTransaction;

// ============================================================
// Payment Architecture
// ============================================================

export type PaymentStatus =
  | "initiated"
  | "slip-uploaded"
  | "under-review"
  | "verified"
  | "rejected"
  | "failed"
  | "refunded"
  | "partially-refunded";

export type PaymentMethod =
  | "bkash"
  | "city-bank"
  | "brac-bank"
  | "dbbl"
  | "paypal"
  | "sccg-card"
  | "bank-transfer-other";

export type PaymentContext = "sales-order" | "school-enrollment";

export interface Payment {
  id: string;
  sccgId: string;
  salesOrderId?: string;
  orderNumber?: string;
  invoiceId?: string;
  invoiceSccgId?: string;
  installmentId?: string;
  paymentContext: PaymentContext;
  schoolEnrollmentId?: string;
  payerUserId: string;
  payerName: string;
  payerEmail: string;
  amount: number;
  amountEur?: number;
  conversionRate?: number;
  currency: "BDT" | "EUR";
  paymentMethod: PaymentMethod;
  paymentMethodName: string;
  transactionReference?: string;
  slipImageUrl?: string;
  slipUploadedAt?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: string;
  sccgCardId?: string;
  sccgCardLast4?: string;
  status: PaymentStatus;
  verifiedByUserId?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  isOnHold?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: "mobile-wallet" | "bank-transfer" | "online-gateway" | "internal";
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  instructions?: string;
  isActive: boolean;
  requiresSlipUpload: boolean;
}

// ============================================================
// Invoice Engine (Enhanced)
// ============================================================

export type InvoiceType = "proforma" | "tax-invoice" | "receipt" | "credit-note";
export type EnhancedInvoiceStatus = "draft" | "sent" | "partially-paid" | "paid" | "overdue" | "cancelled" | "void";

export interface EnhancedInvoice {
  id: string;
  sccgId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  partnerId?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  salesOrderId?: string;
  orderNumber?: string;
  schoolEnrollmentId?: string;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  amountEur?: number;
  conversionRate?: number;
  currency: "BDT" | "EUR";
  status: EnhancedInvoiceStatus;
  dueDate: string;
  pdfUrl?: string;
  sentAt?: string;
  paidAt?: string;
  notes?: string;
  isOnHold?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Installment Engine (Enhanced)
// ============================================================

export interface InstallmentRule {
  id: string;
  minAmount: number;
  maxAmount: number;
  installments: number;
  splitPercents: number[];
  dueDaysFromOrder: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type EnhancedInstallmentStatus = "upcoming" | "due" | "paid" | "overdue" | "waived";

export interface EnhancedInstallment {
  id: string;
  sccgId: string;
  relatedEntityType: "sales-order" | "school-enrollment";
  relatedEntityId: string;
  orderId?: string;
  orderNumber?: string;
  schoolEnrollmentId?: string;
  clientId: string;
  clientName?: string;
  partnerId?: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  amountPaid: number;
  amountEur?: number;
  conversionRate?: number;
  dueDate: string;
  paidDate?: string;
  status: EnhancedInstallmentStatus;
  paymentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Audit Logs
// ============================================================

export interface AuditLogEntry {
  id: string;
  sccgId: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetId: string;
  targetType: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Role Change Request (two-admin approval)
// ============================================================

export interface RoleChangeRequest {
  id: string;
  targetUserId: string;
  targetEmail: string;
  requestedRole: UserRoleType;
  action: "add" | "remove";
  requestedBy: string;
  requestedByEmail: string;
  approvedBy?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  notes?: string;
}

// ============================================================
// HR Module
// ============================================================

export type EmployeeStatus =
  | "onboarding"
  | "probation"
  | "active"
  | "on-leave"
  | "suspended"
  | "notice-period"
  | "terminated"
  | "resigned"
  | "retired";

export type EmployeeDepartment =
  | "management"
  | "technology"
  | "finance"
  | "hr"
  | "sales"
  | "marketing"
  | "operations"
  | "language-school"
  | "education"
  | "support"
  | "other";

export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "intern"
  | "probation";

export interface Employee {
  id: string;
  sccgId: string;
  firebaseUid: string;
  fullName: string;
  email: string;
  personalEmail?: string;
  phone: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  nationality?: string;
  nidOrPassport?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoUrl?: string;
  designation: string;
  department: EmployeeDepartment;
  role?: string;
  team?: string;
  employmentType: EmploymentType;
  joiningDate: string;
  confirmationDate?: string;
  contractEndDate?: string;
  lastWorkingDate?: string;
  probationMonths: number;
  reportsToEmployeeId?: string;
  reportsToName?: string;
  baseSalary?: number;
  salaryCurrency?: "BDT" | "EUR";
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  tinNumber?: string;
  status: EmployeeStatus;
  portalRoles: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
}

export type EmployeeDocType =
  | "cv-resume"
  | "nid-copy"
  | "passport-copy"
  | "offer-letter"
  | "employment-contract"
  | "nda"
  | "photograph"
  | "educational-certificate"
  | "experience-letter"
  | "bank-details-form"
  | "tin-certificate"
  | "termination-letter"
  | "resignation-letter"
  | "performance-review"
  | "other";

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeSccgId: string;
  documentType: EmployeeDocType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
  isConfidential: boolean;
}

export interface OnboardingTask {
  id: string;
  employeeId: string;
  taskName: string;
  category: "documents" | "access" | "equipment" | "training" | "introduction";
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  dueDate?: string;
  notes?: string;
}

// ============================================================
// Language School Module
// ============================================================

export type CourseLanguage = "german" | "english" | "japanese" | "other";
export type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "custom";
export type CourseStatus = "draft" | "published" | "archived";

export interface SchoolCourse {
  id: string;
  sccgId: string;
  courseName: string;
  courseCode: string;
  language: CourseLanguage;
  level: CourseLevel;
  description: string;
  totalSessions: number;
  sessionDurationMinutes: number;
  totalDurationWeeks: number;
  courseFee: number;
  courseFeeCurrency: "BDT" | "EUR";
  maxStudentsPerBatch: number;
  prerequisites?: string;
  syllabusUrl?: string;
  status: CourseStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type BatchStatus =
  | "planned"
  | "enrollment-open"
  | "in-progress"
  | "active"
  | "completed"
  | "results-published"
  | "cancelled"
  | "archived";

export interface SchoolBatch {
  id: string;
  sccgId: string;
  courseId: string;
  courseName: string;
  batchCode: string;
  batchName: string;
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  schedule: string;
  maxStudents: number;
  enrolledStudents: number;
  status: BatchStatus;
  classroomOrLink?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type SchoolStudentStatus =
  | "applied"
  | "enrolled"
  | "active"
  | "on-hold"
  | "completed"
  | "dropped"
  | "expelled";

export interface SchoolEnrollment {
  id: string;
  sccgId: string;
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  batchId: string;
  batchCode: string;
  courseId: string;
  courseName: string;
  totalFee: number;
  discountAmount: number;
  discountReason?: string;
  netFee: number;
  amountPaid: number;
  amountRemaining: number;
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded";
  enrolledAt: string;
  status: SchoolStudentStatus;
  completedAt?: string;
  droppedAt?: string;
  dropReason?: string;
  finalGrade?: string;
  examScore?: number;
  participationCertId?: string;
  completionCertId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type ContentType = "pdf" | "video" | "link" | "document" | "audio" | "image";

export interface SchoolContent {
  id: string;
  courseId: string;
  batchId?: string;
  title: string;
  description?: string;
  contentType: ContentType;
  fileUrl?: string;
  externalUrl?: string;
  fileSize?: number;
  sessionNumber?: number;
  sortOrder: number;
  isPublished: boolean;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SchoolTeacher {
  id: string;
  sccgId: string;
  userId: string; // Links to the global users table
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  language?: string;
  bio?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string;
}

export interface SchoolAttendance {
  id: string;
  batchId: string;
  sessionNumber: number;
  sessionDate: string;
  studentUserId: string;
  studentName: string;
  status: "present" | "absent" | "late" | "excused";
  markedBy: string;
  markedAt: string;
  notes?: string;
}

export type ExamType = "midterm" | "final" | "quiz" | "practical" | "oral" | "assignment";
export type ExamResultStatus = "draft" | "published";

export interface SchoolExamResult {
  id: string;
  batchId: string;
  courseId: string;
  studentUserId: string;
  studentName: string;
  enrollmentId: string;
  examType: ExamType;
  examName: string;
  examDate: string;
  maxScore: number;
  obtainedScore: number;
  percentage: number;
  grade?: string;
  isPassed: boolean;
  remarks?: string;
  status: ExamResultStatus;
  publishedAt?: string;
  enteredBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Certificates
// ============================================================

export type CertificateType = "participation" | "completion";
export type CertificateStatus = "issued" | "revoked" | "expired" | "replaced";

export interface SchoolCertificate {
  id: string;
  sccgId: string;
  certificateNumber: string;
  certificateType: CertificateType;
  studentUserId: string;
  studentName: string;
  studentSccgId: string;
  enrollmentId: string;
  courseId: string;
  courseName: string;
  courseLevel: CourseLevel;
  batchId: string;
  batchCode: string;
  attendancePercentage: number;
  finalGrade?: string;
  examScore?: number;
  issuedDate: string;
  validUntil?: string;
  issuedBy: string;
  issuedByName: string;
  verificationCode: string;
  verificationUrl: string;
  qrCodeData: string;
  qrCodeUrl?: string;
  status: CertificateStatus;
  revokedAt?: string;
  revocationReason?: string;
  revokedBy?: string;
  replacedByCertId?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Grading Scale
// ============================================================

export interface SchoolGradingScale {
  id: string;
  courseId?: string;
  minScore: number;
  maxScore: number;
  grade: string;
  isPassing: boolean;
}

// ============================================================
// Task Board (Kanban)
// ============================================================

export type TaskStatus = "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  partnerId?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
