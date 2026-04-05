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
