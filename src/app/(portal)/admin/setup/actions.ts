"use server";

import { auth } from "@/auth";
import { resolveSiteId, graphGet, graphPost, graphPatch } from "@/lib/graph";
import { revalidatePath } from "next/cache";

/**
 * List definition for SharePoint Infrastructure Setup.
 */
interface ListSchema {
  name: string;
  displayName: string;
  columns: Array<{
    name: string;
    type: "text" | "number" | "dateTime" | "boolean" | "currency" | "note";
  }>;
}

const PORTAL_SCHEMA: ListSchema[] = [
  // ── Core ──
  {
    name: "Partners",
    displayName: "SCCG Partners",
    columns: [
      { name: "Name", type: "text" },
      { name: "Email", type: "text" },
      { name: "PasswordHash", type: "text" },
      { name: "Role", type: "text" },
      { name: "Status", type: "text" },
      { name: "Company", type: "text" },
      { name: "PartnerType", type: "text" },
      { name: "PartnerCode", type: "text" },
      { name: "CommissionTier", type: "text" },
      { name: "OnboardingStatus", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Products",
    displayName: "SCCG Products",
    columns: [
      { name: "Sku", type: "text" },
      { name: "Unit", type: "text" },
      { name: "SessionsCount", type: "number" },
      { name: "RetailPriceEur", type: "currency" },
      { name: "RetailPriceBdt", type: "currency" },
      { name: "Category", type: "text" },
      { name: "Price", type: "currency" },
      { name: "Description", type: "note" },
      { name: "Stock", type: "number" },
      { name: "ImageUrl", type: "text" },
      { name: "Discount", type: "number" },
      { name: "DiscountType", type: "text" },
      { name: "DiscountExpiry", type: "dateTime" },
      { name: "IsAvailable", type: "boolean" },
      { name: "SalesTags", type: "text" },
      { name: "SortOrder", type: "number" },
    ],
  },
  {
    name: "Orders",
    displayName: "SCCG Orders",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "ClientId", type: "text" },
      { name: "ClientName", type: "text" },
      { name: "Items", type: "note" },
      { name: "Status", type: "text" },
      { name: "TotalAmount", type: "currency" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Clients",
    displayName: "SCCG Clients",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "Name", type: "text" },
      { name: "Email", type: "text" },
      { name: "Phone", type: "text" },
      { name: "Company", type: "text" },
      { name: "Address", type: "note" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Activities",
    displayName: "SCCG Activities",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "Type", type: "text" },
      { name: "Description", type: "note" },
      { name: "RelatedId", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  // ── Finance ──
  {
    name: "Financials",
    displayName: "SCCG Financials",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "Period", type: "text" },
      { name: "Revenue", type: "currency" },
      { name: "Outstanding", type: "currency" },
      { name: "Paid", type: "currency" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Installments",
    displayName: "SCCG Installments",
    columns: [
      { name: "OrderId", type: "text" },
      { name: "ClientId", type: "text" },
      { name: "ClientName", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "InstallmentNumber", type: "number" },
      { name: "TotalInstallments", type: "number" },
      { name: "Amount", type: "currency" },
      { name: "DueDate", type: "dateTime" },
      { name: "PaidDate", type: "dateTime" },
      { name: "Status", type: "text" },
    ],
  },
  {
    name: "Transactions",
    displayName: "SCCG Transactions",
    columns: [
      { name: "ClientId", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "Type", type: "text" },
      { name: "Amount", type: "currency" },
      { name: "AmountEUR", type: "currency" },
      { name: "ConversionRate", type: "number" },
      { name: "Reference", type: "text" },
      { name: "OrderId", type: "text" },
      { name: "Description", type: "note" },
      { name: "Date", type: "dateTime" },
    ],
  },
  {
    name: "Expenses",
    displayName: "SCCG Expenses",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "Category", type: "text" },
      { name: "Amount", type: "currency" },
      { name: "AmountEUR", type: "currency" },
      { name: "ConversionRate", type: "number" },
      { name: "Description", type: "note" },
      { name: "Date", type: "dateTime" },
    ],
  },
  {
    name: "Invoices",
    displayName: "SCCG Invoices",
    columns: [
      { name: "InvoiceNumber", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "ClientId", type: "text" },
      { name: "ClientName", type: "text" },
      { name: "OrderId", type: "text" },
      { name: "Amount", type: "currency" },
      { name: "AmountEUR", type: "currency" },
      { name: "ConversionRate", type: "number" },
      { name: "Status", type: "text" },
      { name: "DueDate", type: "dateTime" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  // ── Sales Pipeline ──
  {
    name: "SalesOffers",
    displayName: "SCCG Sales Offers",
    columns: [
      { name: "OfferNumber", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "PartnerName", type: "text" },
      { name: "ClientId", type: "text" },
      { name: "ClientName", type: "text" },
      { name: "ClientEmail", type: "text" },
      { name: "Status", type: "text" },
      { name: "SaleType", type: "text" },
      { name: "ReferralId", type: "text" },
      { name: "ReferralName", type: "text" },
      { name: "ReferralPercent", type: "number" },
      { name: "Subtotal", type: "currency" },
      { name: "Discount", type: "number" },
      { name: "DiscountType", type: "text" },
      { name: "TotalAmount", type: "currency" },
      { name: "ValidUntil", type: "dateTime" },
      { name: "Notes", type: "note" },
      { name: "CreatedBy", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
      { name: "UpdatedAt", type: "dateTime" },
      { name: "SentAt", type: "dateTime" },
      { name: "AcceptedAt", type: "dateTime" },
      { name: "RejectedAt", type: "dateTime" },
      { name: "SalesOrderId", type: "text" },
    ],
  },
  {
    name: "SalesOfferItems",
    displayName: "SCCG Sales Offer Items",
    columns: [
      { name: "SalesOfferId", type: "text" },
      { name: "ProductId", type: "text" },
      { name: "ProductName", type: "text" },
      { name: "Quantity", type: "number" },
      { name: "UnitPrice", type: "currency" },
      { name: "TotalPrice", type: "currency" },
    ],
  },
  {
    name: "SalesOrders",
    displayName: "SCCG Sales Orders",
    columns: [
      { name: "OrderNumber", type: "text" },
      { name: "SalesOfferId", type: "text" },
      { name: "OfferNumber", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "PartnerName", type: "text" },
      { name: "ClientId", type: "text" },
      { name: "ClientName", type: "text" },
      { name: "ClientEmail", type: "text" },
      { name: "Status", type: "text" },
      { name: "TotalAmount", type: "currency" },
      { name: "Notes", type: "note" },
      { name: "CreatedBy", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
      { name: "UpdatedAt", type: "dateTime" },
      { name: "CompletedAt", type: "dateTime" },
    ],
  },
  {
    name: "SalesOrderItems",
    displayName: "SCCG Sales Order Items",
    columns: [
      { name: "SalesOrderId", type: "text" },
      { name: "ProductId", type: "text" },
      { name: "ProductName", type: "text" },
      { name: "Quantity", type: "number" },
      { name: "UnitPrice", type: "currency" },
      { name: "TotalPrice", type: "currency" },
    ],
  },
  {
    name: "ServiceTasks",
    displayName: "SCCG Service Tasks",
    columns: [
      { name: "SalesOrderId", type: "text" },
      { name: "OrderNumber", type: "text" },
      { name: "Description", type: "note" },
      { name: "AssignedTo", type: "text" },
      { name: "Status", type: "text" },
      { name: "DueDate", type: "dateTime" },
      { name: "CompletedAt", type: "dateTime" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  // ── Customer / Expert ──
  {
    name: "Customers",
    displayName: "SCCG Customers",
    columns: [
      { name: "Name", type: "text" },
      { name: "Email", type: "text" },
      { name: "PasswordHash", type: "text" },
      { name: "Phone", type: "text" },
      { name: "Company", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "Status", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Experts",
    displayName: "SCCG Experts",
    columns: [
      { name: "Name", type: "text" },
      { name: "Email", type: "text" },
      { name: "PasswordHash", type: "text" },
      { name: "Phone", type: "text" },
      { name: "Specialization", type: "text" },
      { name: "Bio", type: "note" },
      { name: "Status", type: "text" },
      { name: "Rating", type: "number" },
      { name: "TotalSessionsCompleted", type: "number" },
      { name: "RatePerSession", type: "currency" },
      { name: "FirebaseUid", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "CustomerPackages",
    displayName: "SCCG Customer Packages",
    columns: [
      { name: "CustomerId", type: "text" },
      { name: "CustomerName", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "ServicePackageId", type: "text" },
      { name: "PackageName", type: "text" },
      { name: "OrderId", type: "text" },
      { name: "TotalSessions", type: "number" },
      { name: "CompletedSessions", type: "number" },
      { name: "TotalAmount", type: "currency" },
      { name: "AmountPaid", type: "currency" },
      { name: "StartDate", type: "dateTime" },
      { name: "EndDate", type: "dateTime" },
      { name: "Status", type: "text" },
      { name: "ExpertId", type: "text" },
      { name: "ExpertName", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Sessions",
    displayName: "SCCG Sessions",
    columns: [
      { name: "CustomerPackageId", type: "text" },
      { name: "CustomerId", type: "text" },
      { name: "CustomerName", type: "text" },
      { name: "ExpertId", type: "text" },
      { name: "ExpertName", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "SessionNumber", type: "number" },
      { name: "TotalSessions", type: "number" },
      { name: "ScheduledAt", type: "dateTime" },
      { name: "CompletedAt", type: "dateTime" },
      { name: "DurationMinutes", type: "number" },
      { name: "Status", type: "text" },
      { name: "Notes", type: "note" },
      { name: "ExpertNotes", type: "note" },
      { name: "CustomerRating", type: "number" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "ExpertPayments",
    displayName: "SCCG Expert Payments",
    columns: [
      { name: "ExpertId", type: "text" },
      { name: "ExpertName", type: "text" },
      { name: "SessionId", type: "text" },
      { name: "CustomerId", type: "text" },
      { name: "CustomerName", type: "text" },
      { name: "PartnerId", type: "text" },
      { name: "Amount", type: "currency" },
      { name: "Status", type: "text" },
      { name: "EligibleAt", type: "dateTime" },
      { name: "ApprovedAt", type: "dateTime" },
      { name: "PaidAt", type: "dateTime" },
      { name: "ApprovedBy", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Notifications",
    displayName: "SCCG Notifications",
    columns: [
      { name: "UserId", type: "text" },
      { name: "UserType", type: "text" },
      { name: "Type", type: "text" },
      { name: "Message", type: "note" },
      { name: "Read", type: "boolean" },
      { name: "RelatedId", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  // ── Promotions / Referrals / Payouts ──
  {
    name: "Promotions",
    displayName: "SCCG Promotions",
    columns: [
      { name: "Description", type: "note" },
      { name: "Type", type: "text" },
      { name: "AppliesTo", type: "text" },
      { name: "ProductId", type: "text" },
      { name: "Category", type: "text" },
      { name: "DiscountType", type: "text" },
      { name: "DiscountValue", type: "number" },
      { name: "StartDate", type: "dateTime" },
      { name: "EndDate", type: "dateTime" },
      { name: "IsActive", type: "boolean" },
      { name: "ImageUrl", type: "text" },
      { name: "Priority", type: "number" },
    ],
  },
  {
    name: "Referrals",
    displayName: "SCCG Referrals",
    columns: [
      { name: "ReferrerId", type: "text" },
      { name: "ReferrerName", type: "text" },
      { name: "ReferrerType", type: "text" },
      { name: "SalesOfferId", type: "text" },
      { name: "SalesOrderId", type: "text" },
      { name: "Percentage", type: "number" },
      { name: "Amount", type: "currency" },
      { name: "Status", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Payouts",
    displayName: "SCCG Payouts",
    columns: [
      { name: "RecipientId", type: "text" },
      { name: "RecipientName", type: "text" },
      { name: "RecipientType", type: "text" },
      { name: "RelatedOrderId", type: "text" },
      { name: "RelatedOrderNumber", type: "text" },
      { name: "Gross", type: "currency" },
      { name: "Deductions", type: "currency" },
      { name: "Net", type: "currency" },
      { name: "Currency", type: "text" },
      { name: "Status", type: "text" },
      { name: "PayoutDate", type: "dateTime" },
      { name: "Notes", type: "note" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "EmailTracking",
    displayName: "SCCG Email Tracking",
    columns: [
      { name: "SalesOfferId", type: "text" },
      { name: "OfferNumber", type: "text" },
      { name: "RecipientEmail", type: "text" },
      { name: "RecipientName", type: "text" },
      { name: "SenderName", type: "text" },
      { name: "Subject", type: "text" },
      { name: "Status", type: "text" },
      { name: "SentAt", type: "dateTime" },
      { name: "OpenedAt", type: "dateTime" },
      { name: "AcceptToken", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  // ── Wallet & Cards ──
  {
    name: "CoinWallets",
    displayName: "SCCG Coin Wallets",
    columns: [
      { name: "UserId", type: "text" },
      { name: "UserName", type: "text" },
      { name: "Balance", type: "number" },
      { name: "TotalEarned", type: "number" },
      { name: "TotalSpent", type: "number" },
      { name: "Status", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
      { name: "UpdatedAt", type: "dateTime" },
    ],
  },
  {
    name: "CoinTransactions",
    displayName: "SCCG Coin Transactions",
    columns: [
      { name: "WalletId", type: "text" },
      { name: "UserId", type: "text" },
      { name: "TransactionType", type: "text" },
      { name: "Amount", type: "number" },
      { name: "RunningBalance", type: "number" },
      { name: "Description", type: "note" },
      { name: "ReferenceType", type: "text" },
      { name: "ReferenceId", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
      { name: "CreatedBy", type: "text" },
    ],
  },
  {
    name: "GiftCards",
    displayName: "SCCG Cards",
    columns: [
      { name: "SccgId", type: "text" },
      { name: "CardNumber", type: "text" },
      { name: "PinHash", type: "text" },
      { name: "PinAttempts", type: "number" },
      { name: "IssuedToUserId", type: "text" },
      { name: "IssuedToName", type: "text" },
      { name: "IssuedToEmail", type: "text" },
      { name: "IssuedByUserId", type: "text" },
      { name: "IssuedBy", type: "text" },
      { name: "InitialBalance", type: "currency" },
      { name: "Balance", type: "currency" },
      { name: "Currency", type: "text" },
      { name: "Tier", type: "text" },
      { name: "Status", type: "text" },
      { name: "DesignTemplate", type: "text" },
      { name: "Notes", type: "note" },
      { name: "ActivatedAt", type: "dateTime" },
      { name: "ExpiresAt", type: "dateTime" },
      { name: "IssuedAt", type: "dateTime" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "GiftCardTransactions",
    displayName: "SCCG Card Transactions",
    columns: [
      { name: "SccgCardId", type: "text" },
      { name: "TransactionType", type: "text" },
      { name: "Amount", type: "currency" },
      { name: "RunningBalance", type: "currency" },
      { name: "Description", type: "note" },
      { name: "PerformedBy", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  // ── Promo Codes & Commissions ──
  {
    name: "PromoCodes",
    displayName: "SCCG Promo Codes",
    columns: [
      { name: "Code", type: "text" },
      { name: "CodeType", type: "text" },
      { name: "OwnerId", type: "text" },
      { name: "OwnerName", type: "text" },
      { name: "DiscountType", type: "text" },
      { name: "DiscountValue", type: "number" },
      { name: "MaxUses", type: "number" },
      { name: "CurrentUses", type: "number" },
      { name: "MaxUsesPerUser", type: "number" },
      { name: "MinOrderAmount", type: "currency" },
      { name: "ValidFrom", type: "dateTime" },
      { name: "ValidUntil", type: "dateTime" },
      { name: "Status", type: "text" },
      { name: "ShareableLink", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
      { name: "CreatedBy", type: "text" },
    ],
  },
  {
    name: "CommissionRules",
    displayName: "SCCG Commission Rules",
    columns: [
      { name: "Name", type: "text" },
      { name: "CodeType", type: "text" },
      { name: "PartnerTier", type: "text" },
      { name: "ProductCategory", type: "text" },
      { name: "CommissionPercent", type: "number" },
      { name: "MinOrderAmount", type: "currency" },
      { name: "MaxCommission", type: "currency" },
      { name: "IsActive", type: "boolean" },
      { name: "Priority", type: "number" },
      { name: "EffectiveFrom", type: "dateTime" },
      { name: "EffectiveUntil", type: "dateTime" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "CommissionLedger",
    displayName: "SCCG Commission Ledger",
    columns: [
      { name: "EntryType", type: "text" },
      { name: "RecipientId", type: "text" },
      { name: "RecipientName", type: "text" },
      { name: "RecipientType", type: "text" },
      { name: "SalesOrderId", type: "text" },
      { name: "OrderNumber", type: "text" },
      { name: "PromoCodeId", type: "text" },
      { name: "RuleId", type: "text" },
      { name: "Amount", type: "currency" },
      { name: "Currency", type: "text" },
      { name: "RunningBalance", type: "currency" },
      { name: "Description", type: "note" },
      { name: "CreatedAt", type: "dateTime" },
      { name: "CreatedBy", type: "text" },
    ],
  },
  // ── Language School ──
  {
    name: "LanguageCourses",
    displayName: "SCCG Language Courses",
    columns: [
      { name: "CourseCode", type: "text" },
      { name: "Language", type: "text" },
      { name: "Level", type: "text" },
      { name: "Description", type: "note" },
      { name: "TotalSessions", type: "number" },
      { name: "SessionDurationMinutes", type: "number" },
      { name: "TotalDurationWeeks", type: "number" },
      { name: "CourseFee", type: "currency" },
      { name: "CourseFeeCurrency", type: "text" },
      { name: "MaxStudentsPerBatch", type: "number" },
      { name: "Prerequisites", type: "text" },
      { name: "Status", type: "text" },
    ],
  },
  {
    name: "LanguageBatches",
    displayName: "SCCG Language Batches",
    columns: [
      { name: "CourseId", type: "text" },
      { name: "CourseName", type: "text" },
      { name: "BatchCode", type: "text" },
      { name: "TeacherId", type: "text" },
      { name: "TeacherName", type: "text" },
      { name: "StartDate", type: "dateTime" },
      { name: "EndDate", type: "dateTime" },
      { name: "Schedule", type: "text" },
      { name: "MaxStudents", type: "number" },
      { name: "EnrolledStudents", type: "number" },
      { name: "ClassroomOrLink", type: "text" },
      { name: "Notes", type: "note" },
      { name: "Status", type: "text" },
    ],
  },
  {
    name: "LanguageEnrollments",
    displayName: "SCCG Language Enrollments",
    columns: [
      { name: "StudentUserId", type: "text" },
      { name: "StudentName", type: "text" },
      { name: "StudentEmail", type: "text" },
      { name: "StudentPhone", type: "text" },
      { name: "BatchId", type: "text" },
      { name: "BatchCode", type: "text" },
      { name: "CourseId", type: "text" },
      { name: "CourseName", type: "text" },
      { name: "TotalFee", type: "currency" },
      { name: "DiscountAmount", type: "currency" },
      { name: "NetFee", type: "currency" },
      { name: "PaymentStatus", type: "text" },
      { name: "EnrolledAt", type: "dateTime" },
      { name: "Status", type: "text" },
      { name: "ParticipationCertId", type: "text" },
      { name: "CompletionCertId", type: "text" },
    ],
  },
  {
    name: "LanguageAttendance",
    displayName: "SCCG Language Attendance",
    columns: [
      { name: "BatchId", type: "text" },
      { name: "SessionNumber", type: "number" },
      { name: "SessionDate", type: "dateTime" },
      { name: "StudentUserId", type: "text" },
      { name: "StudentName", type: "text" },
      { name: "Status", type: "text" }, // present, absent, late, excused
      { name: "MarkedBy", type: "text" },
    ],
  },
  {
    name: "LanguageExamResults",
    displayName: "SCCG Language Exam Results",
    columns: [
      { name: "BatchId", type: "text" },
      { name: "CourseId", type: "text" },
      { name: "StudentUserId", type: "text" },
      { name: "StudentName", type: "text" },
      { name: "ExamType", type: "text" }, // midterm, final, placement
      { name: "ExamName", type: "text" },
      { name: "MaxScore", type: "number" },
      { name: "ObtainedScore", type: "number" },
      { name: "Percentage", type: "number" },
      { name: "Grade", type: "text" },
      { name: "IsPassed", type: "boolean" },
      { name: "Remarks", type: "note" },
      { name: "Status", type: "text" }, // draft, published
    ],
  },
  {
    name: "LanguageCertificates",
    displayName: "SCCG Language Certificates",
    columns: [
      { name: "CertificateNumber", type: "text" },
      { name: "CertificateType", type: "text" }, // participation, completion
      { name: "StudentUserId", type: "text" },
      { name: "StudentName", type: "text" },
      { name: "StudentSccgId", type: "text" },
      { name: "EnrollmentId", type: "text" },
      { name: "CourseId", type: "text" },
      { name: "CourseName", type: "text" },
      { name: "CourseLevel", type: "text" },
      { name: "BatchId", type: "text" },
      { name: "BatchCode", type: "text" },
      { name: "AttendancePercentage", type: "number" },
      { name: "FinalGrade", type: "text" },
      { name: "ExamScore", type: "number" },
      { name: "IssuedDate", type: "dateTime" },
      { name: "IssuedByName", type: "text" },
      { name: "VerificationUrl", type: "text" },
      { name: "VerificationCode", type: "text" },
      { name: "Status", type: "text" },
    ],
  },
  {
    name: "LanguageContent",
    displayName: "SCCG Language Content",
    columns: [
      { name: "CourseId", type: "text" },
      { name: "BatchId", type: "text" },
      { name: "Title", type: "text" },
      { name: "Description", type: "note" },
      { name: "ContentType", type: "text" }, // document, video, link, assignment
      { name: "FileUrl", type: "text" },
      { name: "ExternalUrl", type: "text" },
      { name: "SessionNumber", type: "number" },
      { name: "IsPublished", type: "boolean" },
      { name: "SortOrder", type: "number" },
      { name: "UploadedByName", type: "text" },
    ],
  },
  // ── Task Board ──
  {
    name: "KanbanTasks",
    displayName: "SCCG Kanban Tasks",
    columns: [
      { name: "Description", type: "note" },
      { name: "Status", type: "text" },
      { name: "Priority", type: "text" },
      { name: "DueDate", type: "dateTime" },
      { name: "AssignedTo", type: "text" },
      { name: "AssignedToName", type: "text" },
      { name: "AssignedToEmail", type: "text" },
      { name: "CreatedBy", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
      { name: "UpdatedAt", type: "dateTime" },
    ],
  },
];

export async function checkInfrastructureAction() {
  const session = await auth();
  const user = session?.user as any; 
  if (user?.role !== "admin") throw new Error("Unauthorized");

  const siteId = await resolveSiteId();
  const res = await graphGet<{ value: any[] }>(`/sites/${siteId}/lists`);
  const existingLists = res.value.map((l) => l.name);

  return PORTAL_SCHEMA.map((s) => ({
    ...s,
    exists: existingLists.includes(s.name) || existingLists.includes(s.displayName),
  }));
}

export async function initializeInfrastructureAction() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== "admin") throw new Error("Unauthorized");

  const siteId = await resolveSiteId();
  const results = [];

  for (const schema of PORTAL_SCHEMA) {
    try {
      // 1. Create List
      const listRes = await graphPost<any>(`/sites/${siteId}/lists`, {
        displayName: schema.displayName,
        list: { template: "genericList" },
      });
      const listId = listRes.id;

      // 2. Add Columns
      for (const col of schema.columns) {
        if (col.name === "Title") continue; // Title exists by default
        await graphPost(`/sites/${siteId}/lists/${listId}/columns`, {
          name: col.name,
          displayName: col.name,
          [col.type]: {},
        });
      }
      results.push({ name: schema.name, status: "created" });
    } catch (err: any) {
      results.push({ name: schema.name, status: "error", error: err.message });
    }
  }

  revalidatePath("/admin/setup");
  return results;
}

export async function seedProductsAction() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== "admin") throw new Error("Unauthorized");
  
  const { mockProducts } = await import("@/lib/mock-data");
  const { createProduct } = await import("@/lib/sharepoint");

  for (const p of mockProducts) {
    await createProduct(p);
  }
  
  return { success: true, count: mockProducts.length };
}
