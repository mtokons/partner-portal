// ─── Financial Types ───

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type InstallmentStatus = "upcoming" | "due" | "paid" | "overdue";

export interface Invoice {
  id: string;
  partnerId: string;
  clientId: string;
  clientName?: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  currency: "BDT" | "EUR";
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Installment {
  id: string;
  orderId: string;
  orderNumber?: string;
  clientId: string;
  clientName?: string;
  partnerId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: InstallmentStatus;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  partnerId: string;
  category: string;
  amount: number;
  currency: "BDT" | "EUR";
  description: string;
  date: string;
  createdAt: string;
}

// ─── Dashboard KPIs ───

export interface DashboardKPIs {
  totalSales: number;
  activeClients: number;
  pendingOrders: number;
  totalRevenue: number;
  overdueInstallments: number;
  unpaidInvoices: number;
}
