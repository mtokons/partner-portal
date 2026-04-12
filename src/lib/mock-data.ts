import { hashSync } from "bcryptjs";
import type {
  Partner, Product, Order, Client, Activity, Financial,
  Installment, Transaction, Expense, Invoice,
  Customer, Expert, ServicePackage, CustomerPackage,
  Session, ExpertPayment, AppNotification,
  SalesOffer, SalesOfferItem, SalesOrder, SalesOrderItem, ServiceTask,
  PromoCode, CommissionRule, CoinWallet, SccgCard,
} from "@/types";

// ---- Partners ----
export const mockPartners: Partner[] = [
  {
    id: "p1",
    name: "Alice Weber",
    email: "alice@partner.com",
    passwordHash: hashSync("password123", 10),
    role: "partner",
    status: "active",
    company: "Weber Trading GmbH",
    phone: "+49 170 1234567",
    partnerType: "individual",
    commissionTier: "standard",
    onboardingStatus: "approved",
    createdAt: "2025-06-15T10:00:00Z",
  },
  {
    id: "p2",
    name: "Bob Müller",
    email: "bob@partner.com",
    passwordHash: hashSync("password123", 10),
    role: "partner",
    status: "active",
    company: "Müller Distribution",
    phone: "+49 171 9876543",
    partnerType: "institutional",
    commissionTier: "premium",
    onboardingStatus: "approved",
    createdAt: "2025-08-20T10:00:00Z",
  },
  {
    id: "admin1",
    name: "Admin User",
    email: "admin@portal.com",
    passwordHash: hashSync("admin123", 10),
    role: "admin",
    status: "active",
    company: "Portal Admin",
    partnerType: "individual",
    commissionTier: "enterprise",
    onboardingStatus: "approved",
    createdAt: "2025-01-01T10:00:00Z",
  },
];

export const mockProducts: Product[] = [
  { id: "1", sku: "SCCG-AIO-AUSB", name: "Ausbildung All-in-One", description: "Language (A1-B1), ZAB verification, Profile Assessment, Job Training, and Offer Letter.", unit: "Package", sessionsCount: 1, retailPriceEur: 1998, retailPriceBdt: 282237, price: 282237, stock: 100, category: "Ausbildung", imageUrl: "" },
  { id: "2", sku: "SCCG-AIO-STUD", name: "Student Visa All-in-One", description: "Profile Assessment, Uni-Assist fee, application prep, and university offer letter.", unit: "Package", sessionsCount: 1, retailPriceEur: 1390, retailPriceBdt: 196351, price: 196351, stock: 100, category: "Student Visa", imageUrl: "" },
  { id: "3", sku: "SCCG-AIO-OPP", name: "Opp. Card All-in-One", description: "A1 Language, ZAB verification, Profile Assessment, and Job Searching training.", unit: "Package", sessionsCount: 1, retailPriceEur: 1460, retailPriceBdt: 206240, price: 206240, stock: 100, category: "Opportunity Card", imageUrl: "" },
  { id: "4", sku: "SCCG-TR-START", name: "Student Starter Plan", description: "Profile Assessment, CV/Motivation letter feedback, and career development plan.", unit: "Package", sessionsCount: 1, retailPriceEur: 25, retailPriceBdt: 3500, price: 3500, stock: 999, category: "Plans", imageUrl: "" },
  { id: "5", sku: "SCCG-TR-ELG", name: "Eligibility Assessment", description: "Profile evaluation and basic feedback on CV/Cover letter for German careers.", unit: "Session", sessionsCount: 1, retailPriceEur: 35, retailPriceBdt: 5000, price: 5000, stock: 999, category: "Assessment", imageUrl: "" },
  { id: "6", sku: "SCCG-TR-STAND", name: "Student Standard Plan", description: "CV/SOP prep, university selection, application follow-up, and scholarship info.", unit: "Package", sessionsCount: 1, retailPriceEur: 177, retailPriceBdt: 25000, price: 25000, stock: 999, category: "Plans", imageUrl: "" },
  { id: "7", sku: "SCCG-TR-PREM", name: "Student Premium Plan", description: "All Standard Plan benefits plus visa support, interview prep, and relocation.", unit: "Package", sessionsCount: 1, retailPriceEur: 283, retailPriceBdt: 40000, price: 40000, stock: 999, category: "Plans", imageUrl: "" },
  { id: "8", sku: "SCCG-TR-COACH", name: "Advanced Career Coaching", description: "CV/Cover letter design, LinkedIn optimization, and 5 interview/performance sessions.", unit: "Session", sessionsCount: 5, retailPriceEur: 177, retailPriceBdt: 25000, price: 25000, stock: 500, category: "Coaching", imageUrl: "" },
  { id: "9", sku: "SCCG-TR-OPP1", name: "Opportunity Card Prep", description: "Expert-led preparation for the Opportunity Card application process.", unit: "Package", sessionsCount: 1, retailPriceEur: 248, retailPriceBdt: 35000, price: 35000, stock: 500, category: "Opportunity Card", imageUrl: "" },
  { id: "10", sku: "SCCG-TR-OPP2", name: "Opp. Card + Visa", description: "Full Opportunity Card application preparation and professional visa assistance.", unit: "Package", sessionsCount: 1, retailPriceEur: 425, retailPriceBdt: 60000, price: 60000, stock: 500, category: "Opportunity Card", imageUrl: "" },
  { id: "11", sku: "SCCG-TR-AUSB1", name: "Ausbildung Job Training", description: "Specialized coaching for searching and securing Ausbildung positions in Germany.", unit: "Package", sessionsCount: 1, retailPriceEur: 177, retailPriceBdt: 25000, price: 25000, stock: 500, category: "Ausbildung", imageUrl: "" },
  { id: "12", sku: "SCCG-TR-AUSB2", name: "Ausbildung + Visa", description: "Ausbildung job searching training combined with full visa assistance.", unit: "Package", sessionsCount: 1, retailPriceEur: 283, retailPriceBdt: 40000, price: 40000, stock: 500, category: "Ausbildung", imageUrl: "" },
  { id: "13", sku: "SCCG-LAN-A1", name: "German A1", description: "Standard A1 level German language course led by a language teacher.", unit: "Course", sessionsCount: 1, retailPriceEur: 91, retailPriceBdt: 12900, price: 12900, stock: 500, category: "Language", imageUrl: "" },
  { id: "14", sku: "SCCG-LAN-A2", name: "German A2", description: "Standard A2 level German language course led by a language teacher.", unit: "Course", sessionsCount: 1, retailPriceEur: 98, retailPriceBdt: 13900, price: 13900, stock: 500, category: "Language", imageUrl: "" },
  { id: "15", sku: "SCCG-LAN-B1", name: "German B1", description: "Standard B1 level German language course led by a language teacher.", unit: "Course", sessionsCount: 1, retailPriceEur: 120, retailPriceBdt: 16900, price: 16900, stock: 500, category: "Language", imageUrl: "" },
  { id: "16", sku: "SCCG-LAN-IA2", name: "Intensive A1-A2", description: "Intensive dual-level German language program from A1 through A2.", unit: "Course", sessionsCount: 1, retailPriceEur: 177, retailPriceBdt: 25000, price: 25000, stock: 500, category: "Language", imageUrl: "" },
  { id: "17", sku: "SCCG-LAN-IB1", name: "Intensive A1-B1", description: "Intensive triple-level German language program from A1 through B1.", unit: "Course", sessionsCount: 1, retailPriceEur: 282, retailPriceBdt: 39800, price: 39800, stock: 500, category: "Language", imageUrl: "" },
];

// ---- Clients ----
export const mockClients: Client[] = [
  { id: "c1", partnerId: "p1", name: "TechCorp Industries", email: "procurement@techcorp.com", phone: "+49 30 1111111", company: "TechCorp Industries", address: "Berlin, Germany", createdAt: "2025-07-01T10:00:00Z" },
  { id: "c2", partnerId: "p1", name: "SmartBuild AG", email: "orders@smartbuild.de", phone: "+49 40 2222222", company: "SmartBuild AG", address: "Hamburg, Germany", createdAt: "2025-08-15T10:00:00Z" },
  { id: "c3", partnerId: "p1", name: "GreenEnergy Solutions", email: "buy@greenenergy.eu", phone: "+49 89 3333333", company: "GreenEnergy Solutions", address: "Munich, Germany", createdAt: "2025-09-01T10:00:00Z" },
  { id: "c4", partnerId: "p2", name: "AutoParts Direct", email: "info@autoparts.de", phone: "+49 221 4444444", company: "AutoParts Direct", address: "Cologne, Germany", createdAt: "2025-07-20T10:00:00Z" },
  { id: "c5", partnerId: "p2", name: "MedTech Supplies", email: "supply@medtech.de", phone: "+49 69 5555555", company: "MedTech Supplies", address: "Frankfurt, Germany", createdAt: "2025-10-01T10:00:00Z" },
  { id: "c6", partnerId: "p2", name: "EduTech GmbH", email: "orders@edutech.de", phone: "+49 711 6666666", company: "EduTech GmbH", address: "Stuttgart, Germany", createdAt: "2025-11-01T10:00:00Z" },
];

// ---- Orders ----
export const mockOrders: Order[] = [
  { id: "o1", partnerId: "p1", clientId: "c1", clientName: "TechCorp Industries", items: [{ productId: "prod1", productName: "Premium Widget A", quantity: 100, unitPrice: 49.99 }], status: "delivered", totalAmount: 4999, createdAt: "2025-10-01T10:00:00Z" },
  { id: "o2", partnerId: "p1", clientId: "c2", clientName: "SmartBuild AG", items: [{ productId: "prod3", productName: "Connector Kit X", quantity: 50, unitPrice: 89.99 }], status: "shipped", totalAmount: 4499.5, createdAt: "2025-11-15T10:00:00Z" },
  { id: "o3", partnerId: "p1", clientId: "c1", clientName: "TechCorp Industries", items: [{ productId: "prod4", productName: "Sensor Module S1", quantity: 20, unitPrice: 129.99 }, { productId: "prod2", productName: "Standard Widget B", quantity: 200, unitPrice: 24.99 }], status: "pending", totalAmount: 7597.8, createdAt: "2026-01-10T10:00:00Z" },
  { id: "o4", partnerId: "p2", clientId: "c4", clientName: "AutoParts Direct", items: [{ productId: "prod5", productName: "Cable Bundle Pro", quantity: 10, unitPrice: 199.99 }], status: "confirmed", totalAmount: 1999.9, createdAt: "2025-12-01T10:00:00Z" },
  { id: "o5", partnerId: "p2", clientId: "c5", clientName: "MedTech Supplies", items: [{ productId: "prod4", productName: "Sensor Module S1", quantity: 30, unitPrice: 129.99 }], status: "delivered", totalAmount: 3899.7, createdAt: "2025-11-01T10:00:00Z" },
];

// ---- Activities ----
export const mockActivities: Activity[] = [
  { id: "a1", partnerId: "p1", type: "order", description: "New order #o3 placed for TechCorp Industries", relatedId: "o3", createdAt: "2026-01-10T10:00:00Z" },
  { id: "a2", partnerId: "p1", type: "payment", description: "Payment received from SmartBuild AG for order #o2", relatedId: "o2", createdAt: "2025-12-01T10:00:00Z" },
  { id: "a3", partnerId: "p1", type: "client", description: "New client GreenEnergy Solutions added", relatedId: "c3", createdAt: "2025-09-01T10:00:00Z" },
  { id: "a4", partnerId: "p2", type: "order", description: "Order #o5 delivered to MedTech Supplies", relatedId: "o5", createdAt: "2025-12-15T10:00:00Z" },
  { id: "a5", partnerId: "p2", type: "invoice", description: "Invoice generated for AutoParts Direct", relatedId: "c4", createdAt: "2025-12-05T10:00:00Z" },
  { id: "a6", partnerId: "p1", type: "expense", description: "Shipping expense logged: BDT 350", relatedId: "e1", createdAt: "2026-01-15T10:00:00Z" },
];

// ---- Financials ----
export const mockFinancials: Financial[] = [
  { id: "f1", partnerId: "p1", period: "2025-10", revenue: 4999, outstanding: 0, paid: 4999, createdAt: "2025-10-31T10:00:00Z" },
  { id: "f2", partnerId: "p1", period: "2025-11", revenue: 4499.5, outstanding: 1500, paid: 2999.5, createdAt: "2025-11-30T10:00:00Z" },
  { id: "f3", partnerId: "p1", period: "2025-12", revenue: 0, outstanding: 1500, paid: 0, createdAt: "2025-12-31T10:00:00Z" },
  { id: "f4", partnerId: "p1", period: "2026-01", revenue: 7597.8, outstanding: 7597.8, paid: 0, createdAt: "2026-01-31T10:00:00Z" },
  { id: "f5", partnerId: "p2", period: "2025-11", revenue: 3899.7, outstanding: 0, paid: 3899.7, createdAt: "2025-11-30T10:00:00Z" },
  { id: "f6", partnerId: "p2", period: "2025-12", revenue: 1999.9, outstanding: 999.95, paid: 999.95, createdAt: "2025-12-31T10:00:00Z" },
];

// ---- Installments ----
export const mockInstallments: Installment[] = [
  { id: "i1", orderId: "o3", clientId: "c1", clientName: "TechCorp Industries", partnerId: "p1", installmentNumber: 1, totalInstallments: 3, amount: 2532.6, dueDate: "2026-02-10", paidDate: "2026-02-09", status: "paid", notes: "First installment" },
  { id: "i2", orderId: "o3", clientId: "c1", clientName: "TechCorp Industries", partnerId: "p1", installmentNumber: 2, totalInstallments: 3, amount: 2532.6, dueDate: "2026-03-10", status: "overdue", notes: "Second installment" },
  { id: "i3", orderId: "o3", clientId: "c1", clientName: "TechCorp Industries", partnerId: "p1", installmentNumber: 3, totalInstallments: 3, amount: 2532.6, dueDate: "2026-04-10", status: "upcoming", notes: "Third installment" },
  { id: "i4", orderId: "o4", clientId: "c4", clientName: "AutoParts Direct", partnerId: "p2", installmentNumber: 1, totalInstallments: 2, amount: 999.95, dueDate: "2026-01-01", paidDate: "2026-01-02", status: "paid" },
  { id: "i5", orderId: "o4", clientId: "c4", clientName: "AutoParts Direct", partnerId: "p2", installmentNumber: 2, totalInstallments: 2, amount: 999.95, dueDate: "2026-02-01", status: "overdue" },
];

// ---- Transactions ----
export const mockTransactions: Transaction[] = [
  { id: "t1", clientId: "c1", partnerId: "p1", type: "purchase", amount: 4999, reference: "ORD-o1", orderId: "o1", description: "Order #o1 purchase", date: "2025-10-01" },
  { id: "t2", clientId: "c1", partnerId: "p1", type: "payment", amount: 4999, reference: "PAY-001", orderId: "o1", description: "Full payment for order #o1", date: "2025-10-15" },
  { id: "t3", clientId: "c2", partnerId: "p1", type: "purchase", amount: 4499.5, reference: "ORD-o2", orderId: "o2", description: "Order #o2 purchase", date: "2025-11-15" },
  { id: "t4", clientId: "c2", partnerId: "p1", type: "payment", amount: 2999.5, reference: "PAY-002", orderId: "o2", description: "Partial payment for order #o2", date: "2025-12-01" },
  { id: "t5", clientId: "c1", partnerId: "p1", type: "purchase", amount: 7597.8, reference: "ORD-o3", orderId: "o3", description: "Order #o3 purchase", date: "2026-01-10" },
  { id: "t6", clientId: "c1", partnerId: "p1", type: "payment", amount: 2532.6, reference: "PAY-003", orderId: "o3", description: "Installment 1 of 3 for order #o3", date: "2026-02-09" },
  { id: "t7", clientId: "c4", partnerId: "p2", type: "purchase", amount: 1999.9, reference: "ORD-o4", orderId: "o4", description: "Order #o4 purchase", date: "2025-12-01" },
  { id: "t8", clientId: "c4", partnerId: "p2", type: "payment", amount: 999.95, reference: "PAY-004", orderId: "o4", description: "Installment 1 of 2 for order #o4", date: "2026-01-02" },
  { id: "t9", clientId: "c5", partnerId: "p2", type: "purchase", amount: 3899.7, reference: "ORD-o5", orderId: "o5", description: "Order #o5 purchase", date: "2025-11-01" },
  { id: "t10", clientId: "c5", partnerId: "p2", type: "payment", amount: 3899.7, reference: "PAY-005", orderId: "o5", description: "Full payment for order #o5", date: "2025-11-20" },
];

// ---- Expenses ----
export const mockExpenses: Expense[] = [
  { id: "e1", partnerId: "p1", category: "Shipping", amount: 350, description: "DHL Express shipping for Q4 orders", date: "2026-01-15" },
  { id: "e2", partnerId: "p1", category: "Marketing", amount: 800, description: "LinkedIn campaign Q1 2026", date: "2026-01-20" },
  { id: "e3", partnerId: "p1", category: "Office", amount: 120, description: "Office supplies", date: "2026-02-01" },
  { id: "e4", partnerId: "p2", category: "Shipping", amount: 200, description: "Standard shipping costs", date: "2025-12-10" },
  { id: "e5", partnerId: "p2", category: "Travel", amount: 450, description: "Client visit in Frankfurt", date: "2026-01-05" },
];

// ---- Invoices ----
export const mockInvoices: Invoice[] = [
  { id: "inv1", partnerId: "p1", clientId: "c1", clientName: "TechCorp Industries", orderId: "o1", amount: 4999, status: "paid", dueDate: "2025-10-31", createdAt: "2025-10-01T10:00:00Z" },
  { id: "inv2", partnerId: "p1", clientId: "c2", clientName: "SmartBuild AG", orderId: "o2", amount: 4499.5, status: "overdue", dueDate: "2025-12-15", createdAt: "2025-11-15T10:00:00Z" },
  { id: "inv3", partnerId: "p1", clientId: "c1", clientName: "TechCorp Industries", orderId: "o3", amount: 7597.8, status: "sent", dueDate: "2026-02-10", createdAt: "2026-01-10T10:00:00Z" },
  { id: "inv4", partnerId: "p2", clientId: "c4", clientName: "AutoParts Direct", orderId: "o4", amount: 1999.9, status: "sent", dueDate: "2026-01-31", createdAt: "2025-12-01T10:00:00Z" },
  { id: "inv5", partnerId: "p2", clientId: "c5", clientName: "MedTech Supplies", orderId: "o5", amount: 3899.7, status: "paid", dueDate: "2025-12-01", createdAt: "2025-11-01T10:00:00Z" },
];

// ============================================================
// Customer Portal Mock Data
// ============================================================

// ---- Customers ----
export const mockCustomers: Customer[] = [
  {
    id: "cust1",
    name: "Maria Schmidt",
    email: "maria@customer.com",
    passwordHash: hashSync("customer123", 10),
    phone: "+49 170 8888888",
    company: "Schmidt Consulting",
    partnerId: "p1",
    status: "active",
    createdAt: "2025-11-01T10:00:00Z",
  },
  {
    id: "cust2",
    name: "Thomas Klein",
    email: "thomas@customer.com",
    passwordHash: hashSync("customer123", 10),
    phone: "+49 171 7777777",
    company: "Klein Digital GmbH",
    partnerId: "p1",
    status: "active",
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "cust3",
    name: "Julia Braun",
    email: "julia@customer.com",
    passwordHash: hashSync("customer123", 10),
    phone: "+49 172 6666666",
    company: "Braun Innovations",
    partnerId: "p2",
    status: "active",
    createdAt: "2025-10-15T10:00:00Z",
  },
];

// ---- Experts ----
export const mockExperts: Expert[] = [
  {
    id: "exp1",
    name: "Andreas Fischer",
    email: "andreas@expert.com",
    passwordHash: hashSync("expert123", 10),
    phone: "+49 160 1112222",
    specialization: "Business Consulting",
    bio: "10+ years in strategic business development and growth consulting.",
    status: "active",
    rating: 4.8,
    totalSessionsCompleted: 3,
    ratePerSession: 80,
    createdAt: "2025-05-01T10:00:00Z",
  },
  {
    id: "exp2",
    name: "Sarah Weber",
    email: "sarah@expert.com",
    passwordHash: hashSync("expert123", 10),
    phone: "+49 161 3334444",
    specialization: "Technical Architecture",
    bio: "Full-stack architect specializing in cloud infrastructure and DevOps.",
    status: "active",
    rating: 4.9,
    totalSessionsCompleted: 5,
    ratePerSession: 100,
    createdAt: "2025-04-01T10:00:00Z",
  },
];

// ---- Service Packages ----
export const mockServicePackages: ServicePackage[] = [
  {
    id: "sp1",
    name: "Business Growth Package",
    description: "10 strategy sessions to accelerate your business growth.",
    totalSessions: 10,
    sessionDurationMinutes: 60,
    validityDays: 180,
    price: 2999,
    category: "Business Consulting",
  },
  {
    id: "sp2",
    name: "Technical Excellence Package",
    description: "8 deep-dive technical sessions for architecture and DevOps.",
    totalSessions: 8,
    sessionDurationMinutes: 90,
    validityDays: 120,
    price: 3499,
    category: "Technical Architecture",
  },
  {
    id: "sp3",
    name: "Starter Mentoring Package",
    description: "5 foundational mentoring sessions for new businesses.",
    totalSessions: 5,
    sessionDurationMinutes: 45,
    validityDays: 90,
    price: 999,
    category: "Business Consulting",
  },
];

// ---- Customer Packages (purchased instances) ----
export const mockCustomerPackages: CustomerPackage[] = [
  {
    id: "cp1",
    customerId: "cust1",
    customerName: "Maria Schmidt",
    partnerId: "p1",
    servicePackageId: "sp1",
    packageName: "Business Growth Package",
    totalSessions: 10,
    completedSessions: 3,
    totalAmount: 2999,
    amountPaid: 1499.50,
    startDate: "2025-11-15",
    endDate: "2026-05-15",
    status: "active",
    expertId: "exp1",
    expertName: "Andreas Fischer",
    createdAt: "2025-11-15T10:00:00Z",
  },
  {
    id: "cp2",
    customerId: "cust2",
    customerName: "Thomas Klein",
    partnerId: "p1",
    servicePackageId: "sp3",
    packageName: "Starter Mentoring Package",
    totalSessions: 5,
    completedSessions: 0,
    totalAmount: 999,
    amountPaid: 0,
    startDate: "2026-01-01",
    endDate: "2026-04-01",
    status: "active",
    createdAt: "2026-01-01T10:00:00Z",
  },
  {
    id: "cp3",
    customerId: "cust3",
    customerName: "Julia Braun",
    partnerId: "p2",
    servicePackageId: "sp2",
    packageName: "Technical Excellence Package",
    totalSessions: 8,
    completedSessions: 5,
    totalAmount: 3499,
    amountPaid: 2800,
    startDate: "2025-10-20",
    endDate: "2026-02-20",
    status: "active",
    expertId: "exp2",
    expertName: "Sarah Weber",
    createdAt: "2025-10-20T10:00:00Z",
  },
];

// ---- Sessions (auto-generated per package) ----
// cp1: 10 sessions, 3 completed, 1 scheduled, 6 pending
// cp2: 5 sessions, all pending (no expert yet)
// cp3: 8 sessions, 5 completed, 1 scheduled, 2 pending
export const mockSessions: Session[] = [
  // cp1 — Maria Schmidt × Andreas Fischer
  { id: "ses1", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 1, totalSessions: 10, scheduledAt: "2025-12-01T10:00:00Z", completedAt: "2025-12-01T11:00:00Z", durationMinutes: 60, status: "completed", notes: "Initial strategy review.", expertNotes: "Strong foundation. Focus on sales funnel.", customerRating: 5, createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses2", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 2, totalSessions: 10, scheduledAt: "2025-12-15T10:00:00Z", completedAt: "2025-12-15T11:00:00Z", durationMinutes: 60, status: "completed", notes: "Marketing strategy deep-dive.", expertNotes: "Digital ads performing well.", customerRating: 5, createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses3", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 3, totalSessions: 10, scheduledAt: "2026-01-10T10:00:00Z", completedAt: "2026-01-10T11:00:00Z", durationMinutes: 60, status: "completed", notes: "OKR planning for Q1.", expertNotes: "Goals clearly set. Team alignment needed.", customerRating: 4, createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses4", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 4, totalSessions: 10, scheduledAt: "2026-03-28T10:00:00Z", status: "scheduled", createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses5", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 5, totalSessions: 10, status: "pending", createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses6", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 6, totalSessions: 10, status: "pending", createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses7", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 7, totalSessions: 10, status: "pending", createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses8", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 8, totalSessions: 10, status: "pending", createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses9", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 9, totalSessions: 10, status: "pending", createdAt: "2025-11-15T10:00:00Z" },
  { id: "ses10", customerPackageId: "cp1", customerId: "cust1", customerName: "Maria Schmidt", expertId: "exp1", expertName: "Andreas Fischer", partnerId: "p1", sessionNumber: 10, totalSessions: 10, status: "pending", createdAt: "2025-11-15T10:00:00Z" },
  // cp2 — Thomas Klein (no expert assigned yet)
  { id: "ses11", customerPackageId: "cp2", customerId: "cust2", customerName: "Thomas Klein", partnerId: "p1", sessionNumber: 1, totalSessions: 5, status: "pending", createdAt: "2026-01-01T10:00:00Z" },
  { id: "ses12", customerPackageId: "cp2", customerId: "cust2", customerName: "Thomas Klein", partnerId: "p1", sessionNumber: 2, totalSessions: 5, status: "pending", createdAt: "2026-01-01T10:00:00Z" },
  { id: "ses13", customerPackageId: "cp2", customerId: "cust2", customerName: "Thomas Klein", partnerId: "p1", sessionNumber: 3, totalSessions: 5, status: "pending", createdAt: "2026-01-01T10:00:00Z" },
  { id: "ses14", customerPackageId: "cp2", customerId: "cust2", customerName: "Thomas Klein", partnerId: "p1", sessionNumber: 4, totalSessions: 5, status: "pending", createdAt: "2026-01-01T10:00:00Z" },
  { id: "ses15", customerPackageId: "cp2", customerId: "cust2", customerName: "Thomas Klein", partnerId: "p1", sessionNumber: 5, totalSessions: 5, status: "pending", createdAt: "2026-01-01T10:00:00Z" },
  // cp3 — Julia Braun × Sarah Weber
  { id: "ses16", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 1, totalSessions: 8, scheduledAt: "2025-11-01T14:00:00Z", completedAt: "2025-11-01T15:30:00Z", durationMinutes: 90, status: "completed", notes: "Cloud migration assessment.", expertNotes: "AWS recommended.", customerRating: 5, createdAt: "2025-10-20T10:00:00Z" },
  { id: "ses17", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 2, totalSessions: 8, scheduledAt: "2025-11-15T14:00:00Z", completedAt: "2025-11-15T15:30:00Z", durationMinutes: 90, status: "completed", notes: "Infrastructure design.", expertNotes: "IaC with Terraform planned.", customerRating: 5, createdAt: "2025-10-20T10:00:00Z" },
  { id: "ses18", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 3, totalSessions: 8, scheduledAt: "2025-12-01T14:00:00Z", completedAt: "2025-12-01T15:30:00Z", durationMinutes: 90, status: "completed", notes: "CI/CD pipeline setup.", expertNotes: "GitHub Actions integrated.", customerRating: 4, createdAt: "2025-10-20T10:00:00Z" },
  { id: "ses19", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 4, totalSessions: 8, scheduledAt: "2026-01-10T14:00:00Z", completedAt: "2026-01-10T15:30:00Z", durationMinutes: 90, status: "completed", notes: "Security hardening.", expertNotes: "WAF configured.", customerRating: 5, createdAt: "2025-10-20T10:00:00Z" },
  { id: "ses20", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 5, totalSessions: 8, scheduledAt: "2026-02-15T14:00:00Z", completedAt: "2026-02-15T15:30:00Z", durationMinutes: 90, status: "completed", notes: "Monitoring & alerting.", expertNotes: "Grafana dashboard live.", customerRating: 5, createdAt: "2025-10-20T10:00:00Z" },
  { id: "ses21", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 6, totalSessions: 8, scheduledAt: "2026-03-30T14:00:00Z", status: "scheduled", createdAt: "2025-10-20T10:00:00Z" },
  { id: "ses22", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 7, totalSessions: 8, status: "pending", createdAt: "2025-10-20T10:00:00Z" },
  { id: "ses23", customerPackageId: "cp3", customerId: "cust3", customerName: "Julia Braun", expertId: "exp2", expertName: "Sarah Weber", partnerId: "p2", sessionNumber: 8, totalSessions: 8, status: "pending", createdAt: "2025-10-20T10:00:00Z" },
];

// ---- Expert Payments ----
export const mockExpertPayments: ExpertPayment[] = [
  { id: "ep1", expertId: "exp1", expertName: "Andreas Fischer", sessionId: "ses1", customerId: "cust1", customerName: "Maria Schmidt", partnerId: "p1", amount: 80, status: "paid", eligibleAt: "2025-12-01T11:00:00Z", approvedAt: "2025-12-10T09:00:00Z", paidAt: "2025-12-15T09:00:00Z", approvedBy: "admin1", createdAt: "2025-12-01T11:00:00Z" },
  { id: "ep2", expertId: "exp1", expertName: "Andreas Fischer", sessionId: "ses2", customerId: "cust1", customerName: "Maria Schmidt", partnerId: "p1", amount: 80, status: "approved", eligibleAt: "2025-12-15T11:00:00Z", approvedAt: "2026-01-05T09:00:00Z", approvedBy: "admin1", createdAt: "2025-12-15T11:00:00Z" },
  { id: "ep3", expertId: "exp1", expertName: "Andreas Fischer", sessionId: "ses3", customerId: "cust1", customerName: "Maria Schmidt", partnerId: "p1", amount: 80, status: "eligible", eligibleAt: "2026-01-10T11:00:00Z", createdAt: "2026-01-10T11:00:00Z" },
  { id: "ep4", expertId: "exp2", expertName: "Sarah Weber", sessionId: "ses16", customerId: "cust3", customerName: "Julia Braun", partnerId: "p2", amount: 100, status: "paid", eligibleAt: "2025-11-01T15:30:00Z", approvedAt: "2025-11-10T09:00:00Z", paidAt: "2025-11-15T09:00:00Z", approvedBy: "admin1", createdAt: "2025-11-01T15:30:00Z" },
  { id: "ep5", expertId: "exp2", expertName: "Sarah Weber", sessionId: "ses17", customerId: "cust3", customerName: "Julia Braun", partnerId: "p2", amount: 100, status: "paid", eligibleAt: "2025-11-15T15:30:00Z", approvedAt: "2025-11-25T09:00:00Z", paidAt: "2025-11-30T09:00:00Z", approvedBy: "admin1", createdAt: "2025-11-15T15:30:00Z" },
  { id: "ep6", expertId: "exp2", expertName: "Sarah Weber", sessionId: "ses18", customerId: "cust3", customerName: "Julia Braun", partnerId: "p2", amount: 100, status: "paid", eligibleAt: "2025-12-01T15:30:00Z", approvedAt: "2025-12-12T09:00:00Z", paidAt: "2025-12-18T09:00:00Z", approvedBy: "admin1", createdAt: "2025-12-01T15:30:00Z" },
  { id: "ep7", expertId: "exp2", expertName: "Sarah Weber", sessionId: "ses19", customerId: "cust3", customerName: "Julia Braun", partnerId: "p2", amount: 100, status: "approved", eligibleAt: "2026-01-10T15:30:00Z", approvedAt: "2026-01-20T09:00:00Z", approvedBy: "admin1", createdAt: "2026-01-10T15:30:00Z" },
  { id: "ep8", expertId: "exp2", expertName: "Sarah Weber", sessionId: "ses20", customerId: "cust3", customerName: "Julia Braun", partnerId: "p2", amount: 100, status: "eligible", eligibleAt: "2026-02-15T15:30:00Z", createdAt: "2026-02-15T15:30:00Z" },
];

// ---- Notifications ----
export const mockNotifications: AppNotification[] = [
  { id: "notif1", userId: "cust1", userType: "customer", type: "session_scheduled", title: "Session Scheduled", message: "Your session #4 with Andreas Fischer is scheduled for 28 Mar 2026 at 10:00.", read: false, relatedId: "ses4", createdAt: "2026-03-20T09:00:00Z" },
  { id: "notif2", userId: "cust1", userType: "customer", type: "payment_due", title: "Payment Due", message: "A payment of BDT 1,499.50 for your Business Growth Package is due on 15 Apr 2026.", read: false, createdAt: "2026-03-15T09:00:00Z" },
  { id: "notif3", userId: "cust2", userType: "customer", type: "general", title: "Expert Being Assigned", message: "Our team is assigning an expert to your Starter Mentoring Package. You will be notified shortly.", read: false, createdAt: "2026-01-05T09:00:00Z" },
  { id: "notif4", userId: "cust3", userType: "customer", type: "session_completed", title: "Session Completed", message: "Session #5 (Monitoring & Alerting) has been completed. Your rating helps us improve!", read: true, relatedId: "ses20", createdAt: "2026-02-15T16:00:00Z" },
  { id: "notif5", userId: "exp1", userType: "expert", type: "expert_assigned", title: "New Client Assigned", message: "You have been assigned to Maria Schmidt's Business Growth Package (10 sessions).", read: true, relatedId: "cp1", createdAt: "2025-11-16T09:00:00Z" },
  { id: "notif6", userId: "exp1", userType: "expert", type: "session_reminder", title: "Session Tomorrow", message: "Reminder: Session #4 with Maria Schmidt is scheduled for tomorrow at 10:00.", read: false, relatedId: "ses4", createdAt: "2026-03-27T09:00:00Z" },
  { id: "notif7", userId: "exp2", userType: "expert", type: "payment_approved", title: "Payment Approved", message: "Your payment of BDT 100 for session #4 with Julia Braun has been approved and will be processed.", read: true, relatedId: "ep7", createdAt: "2026-01-20T09:00:00Z" },
  { id: "notif8", userId: "exp2", userType: "expert", type: "payment_eligible", title: "Payment Eligible", message: "You are now eligible for payment of BDT 100 for completing session #5 with Julia Braun.", read: false, relatedId: "ep8", createdAt: "2026-02-15T16:00:00Z" },
];

// ============================================================
// Sales Offers & Sales Orders Mock Data
// ============================================================

export const mockSalesOffers: SalesOffer[] = [
  {
    id: "sof1",
    offerNumber: "SO-2026-00001",
    partnerId: "p1",
    partnerName: "Alice Weber",
    clientId: "c1",
    clientName: "TechCorp Industries",
    clientEmail: "procurement@techcorp.com",
    status: "accepted",
    saleType: "partner-individual",
    subtotal: 7498.5,
    discount: 5,
    discountType: "percent",
    totalAmount: 7123.58,
    validUntil: "2026-03-01",
    notes: "Bulk order for Q1 2026",
    createdBy: "p1",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-20T10:00:00Z",
    sentAt: "2026-01-16T09:00:00Z",
    acceptedAt: "2026-01-20T10:00:00Z",
    salesOrderId: "sord1",
  },
  {
    id: "sof2",
    offerNumber: "SO-2026-00002",
    partnerId: "p1",
    partnerName: "Alice Weber",
    clientId: "c2",
    clientName: "SmartBuild AG",
    clientEmail: "orders@smartbuild.de",
    status: "sent",
    saleType: "direct",
    subtotal: 4499.5,
    discount: 0,
    discountType: "fixed",
    totalAmount: 4499.5,
    validUntil: "2026-04-15",
    notes: "Connector kits for Hamburg warehouse",
    createdBy: "p1",
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-02-11T08:00:00Z",
    sentAt: "2026-02-11T08:00:00Z",
  },
  {
    id: "sof3",
    offerNumber: "SO-2026-00003",
    partnerId: "p2",
    partnerName: "Bob Müller",
    clientId: "c4",
    clientName: "AutoParts Direct",
    clientEmail: "info@autoparts.de",
    status: "draft",
    saleType: "direct-referral",
    referralId: "p1",
    referralName: "Alice Weber",
    referralPercent: 8,
    subtotal: 2599.87,
    discount: 100,
    discountType: "fixed",
    totalAmount: 2499.87,
    validUntil: "2026-05-01",
    createdBy: "p2",
    createdAt: "2026-03-20T10:00:00Z",
    updatedAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "sof4",
    offerNumber: "SO-2026-00004",
    partnerId: "p1",
    partnerName: "Alice Weber",
    clientId: "c3",
    clientName: "GreenEnergy Solutions",
    clientEmail: "buy@greenenergy.eu",
    status: "rejected",
    saleType: "partner-institutional",
    subtotal: 12999,
    discount: 10,
    discountType: "percent",
    totalAmount: 11699.1,
    validUntil: "2026-03-15",
    notes: "Large sensor deployment — client chose competitor",
    createdBy: "p1",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-20T10:00:00Z",
    sentAt: "2026-02-02T08:00:00Z",
    rejectedAt: "2026-02-20T10:00:00Z",
  },
];

export const mockSalesOfferItems: SalesOfferItem[] = [
  // sof1 items
  { id: "sofi1", salesOfferId: "sof1", productId: "prod1", productName: "Premium Widget A", quantity: 100, unitPrice: 49.99, totalPrice: 4999 },
  { id: "sofi2", salesOfferId: "sof1", productId: "prod2", productName: "Standard Widget B", quantity: 100, unitPrice: 24.99, totalPrice: 2499.5 },
  // sof2 items
  { id: "sofi3", salesOfferId: "sof2", productId: "prod3", productName: "Connector Kit X", quantity: 50, unitPrice: 89.99, totalPrice: 4499.5 },
  // sof3 items
  { id: "sofi4", salesOfferId: "sof3", productId: "prod4", productName: "Sensor Module S1", quantity: 10, unitPrice: 129.99, totalPrice: 1299.9 },
  { id: "sofi5", salesOfferId: "sof3", productId: "prod5", productName: "Cable Bundle Pro", quantity: 5, unitPrice: 199.99, totalPrice: 999.97 },
  { id: "sofi6", salesOfferId: "sof3", productId: "prod2", productName: "Standard Widget B", quantity: 12, unitPrice: 24.99, totalPrice: 300 },
  // sof4 items
  { id: "sofi7", salesOfferId: "sof4", productId: "prod4", productName: "Sensor Module S1", quantity: 100, unitPrice: 129.99, totalPrice: 12999 },
];

export const mockSalesOrders: SalesOrder[] = [
  {
    id: "sord1",
    orderNumber: "ORD-2026-00001",
    salesOfferId: "sof1",
    offerNumber: "SO-2026-00001",
    partnerId: "p1",
    partnerName: "Alice Weber",
    clientId: "c1",
    clientName: "TechCorp Industries",
    clientEmail: "procurement@techcorp.com",
    status: "in-progress",
    totalAmount: 7123.58,
    notes: "Converted from offer SO-2026-00001",
    createdBy: "p1",
    createdAt: "2026-01-20T10:30:00Z",
    updatedAt: "2026-01-25T10:00:00Z",
  },
];

export const mockSalesOrderItems: SalesOrderItem[] = [
  { id: "sordi1", salesOrderId: "sord1", productId: "prod1", productName: "Premium Widget A", quantity: 100, unitPrice: 49.99, totalPrice: 4999 },
  { id: "sordi2", salesOrderId: "sord1", productId: "prod2", productName: "Standard Widget B", quantity: 100, unitPrice: 24.99, totalPrice: 2499.5 },
];

export const mockServiceTasks: ServiceTask[] = [
  { id: "st1", salesOrderId: "sord1", orderNumber: "ORD-2026-00001", title: "Prepare shipment for Widget A", description: "Package 100 units of Premium Widget A", assignedTo: "Alice Weber", status: "completed", dueDate: "2026-02-01", completedAt: "2026-01-30T10:00:00Z", createdAt: "2026-01-20T11:00:00Z" },
  { id: "st2", salesOrderId: "sord1", orderNumber: "ORD-2026-00001", title: "Deliver Standard Widget B", description: "Ship 100 units to Berlin warehouse", assignedTo: "Alice Weber", status: "in-progress", dueDate: "2026-02-15", createdAt: "2026-01-20T11:00:00Z" },
  { id: "st3", salesOrderId: "sord1", orderNumber: "ORD-2026-00001", title: "Quality inspection", description: "Final QA check post-delivery", status: "planned", dueDate: "2026-02-20", createdAt: "2026-01-20T11:00:00Z" },
];

// ---- Promo Codes ----
export const mockPromoCodes: PromoCode[] = [
  { id: "pc1", code: "SCCG2026", codeType: "promo-general", ownerId: "admin1", ownerName: "Admin User", discountType: "percent", discountValue: 10, maxUses: 100, currentUses: 5, maxUsesPerUser: 1, minOrderAmount: 5000, validFrom: "2026-01-01", validUntil: "2026-12-31", status: "active", shareableLink: "/shop?promo=SCCG2026", createdAt: "2026-01-01T00:00:00Z", createdBy: "admin1" },
  { id: "pc2", code: "ALICE-REF", codeType: "referral-partner-individual", ownerId: "p1", ownerName: "Alice Weber", partnerProfileId: "p1", discountType: "percent", discountValue: 5, commissionRuleId: "cr1", maxUses: 0, currentUses: 2, maxUsesPerUser: 0, minOrderAmount: 0, validFrom: "2026-01-01", status: "active", shareableLink: "/shop?ref=ALICE-REF", createdAt: "2026-01-15T00:00:00Z", createdBy: "p1" },
  { id: "pc3", code: "MULLER-INST", codeType: "referral-partner-institutional", ownerId: "p2", ownerName: "Bob Müller", partnerProfileId: "p2", discountType: "fixed", discountValue: 2000, commissionRuleId: "cr2", maxUses: 0, currentUses: 0, maxUsesPerUser: 0, minOrderAmount: 10000, validFrom: "2026-01-01", status: "active", shareableLink: "/shop?ref=MULLER-INST", createdAt: "2026-02-01T00:00:00Z", createdBy: "p2" },
];

// ---- Commission Rules ----
export const mockCommissionRules: CommissionRule[] = [
  { id: "cr1", name: "Individual Standard", codeType: "referral-partner-individual", partnerTier: "standard", productCategory: "all", commissionPercent: 15, minOrderAmount: 0, maxCommission: 50000, isActive: true, priority: 10, effectiveFrom: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
  { id: "cr2", name: "Institutional Standard", codeType: "referral-partner-institutional", partnerTier: "standard", productCategory: "all", commissionPercent: 25, minOrderAmount: 0, maxCommission: 200000, isActive: true, priority: 20, effectiveFrom: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
  { id: "cr3", name: "Individual Premium", codeType: "referral-partner-individual", partnerTier: "premium", productCategory: "all", commissionPercent: 20, minOrderAmount: 0, maxCommission: 100000, isActive: true, priority: 15, effectiveFrom: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
  { id: "cr4", name: "Institutional Enterprise", codeType: "referral-partner-institutional", partnerTier: "enterprise", productCategory: "all", commissionPercent: 30, minOrderAmount: 0, maxCommission: 500000, isActive: true, priority: 25, effectiveFrom: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
  { id: "cr5", name: "General Promo (0%)", codeType: "promo-general", partnerTier: "any", productCategory: "all", commissionPercent: 0, minOrderAmount: 0, maxCommission: 0, isActive: true, priority: 1, effectiveFrom: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
];

// ---- Coin Wallets ----
export const mockCoinWallets: CoinWallet[] = [
  { id: "w1", userId: "p1", userName: "Alice Weber", balance: 1500, totalEarned: 2000, totalSpent: 500, status: "active", createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { id: "w2", userId: "p2", userName: "Bob Müller", balance: 5000, totalEarned: 5000, totalSpent: 0, status: "active", createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { id: "w3", userId: "admin1", userName: "Admin User", balance: 99999, totalEarned: 100000, totalSpent: 1, status: "active", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
];

// ---- SCCG Cards (formerly Gift Cards) ----
export const mockGiftCards: SccgCard[] = [
  { 
    id: "gc1", 
    sccgId: "SCCG-CARD-0001",
    cardNumber: "SCCG-GC-1001-0001-0001", 
    pinHash: "placeholder", 
    pinAttempts: 0,
    issuedToUserId: "p1", 
    issuedToName: "Alice Weber", 
    issuedToEmail: "alice@partner.com", 
    issuedByUserId: "admin1", 
    initialBalance: 5000, 
    currentBalance: 3500, 
    currency: "BDT", 
    status: "active", 
    designTemplate: "premium", 
    balance: 3500,
    activatedAt: "2026-02-01T00:00:00Z", 
    expiresAt: "2027-02-01T00:00:00Z", 
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z" 
  },
  { 
    id: "gc2", 
    sccgId: "SCCG-CARD-0002",
    cardNumber: "SCCG-GC-1001-0002-0002", 
    pinHash: "placeholder", 
    pinAttempts: 0,
    issuedToUserId: "p2", 
    issuedToName: "Bob Müller", 
    issuedToEmail: "bob@partner.com", 
    issuedByUserId: "admin1", 
    initialBalance: 10000, 
    currentBalance: 10000, 
    currency: "BDT", 
    status: "active", 
    designTemplate: "corporate", 
    balance: 10000,
    activatedAt: "2026-03-01T00:00:00Z", 
    expiresAt: "2027-03-01T00:00:00Z", 
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z" 
  },
];
