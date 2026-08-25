// ============================================================
// Menu Engine — Dynamic menu resolution for all consoles
// ============================================================
// Default menus are defined per console below.
// Admin can override via SharePoint "MenuConfig" list.
// Resolution: role defaults → merge user overrides → final menu.
// ============================================================

import type { UserRole } from "@/types";

export type ConsoleType = "partner" | "admin" | "student" | "customer" | "expert" | "school-admin" | "project-partner" | "job-seeker" | "job-partner" | "ausbildung-seeker" | "ausbildung-partner" | "sccg";

export interface MenuItem {
  key: string;           // Unique key: "partner.dashboard"
  label: string;         // Display label
  href: string;          // Route path
  icon: string;          // Lucide icon name
  group: string;         // Group key
  groupLabel: string;    // Group display label
  groupOrder: number;    // Sort order of the group
  itemOrder: number;     // Sort order within group
  isEnabled: boolean;    // Toggle on/off
  isDefault: boolean;    // Part of default role menu
  isLocked: boolean;     // Cannot be disabled by admin
  adminOnly?: boolean;   // Only visible to console admins (e.g. SCCG Admin, not SCCG Staff)
}

export interface MenuConfigRecord {
  id: string;
  scope: "role" | "user";
  roleTarget?: string;
  userTarget?: string;
  menuKey: string;
  label: string;
  href: string;
  icon: string;
  groupName: string;
  groupOrder: number;
  itemOrder: number;
  isEnabled: boolean;
  isDefault: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

// ============================================================
// Console Metadata
// ============================================================

export const CONSOLE_META: Record<ConsoleType, { label: string; subtitle: string }> = {
  partner:      { label: "Partner Portal",         subtitle: "Partner Console" },
  admin:        { label: "Admin Portal",           subtitle: "Administration" },
  student:      { label: "Student Portal",         subtitle: "Learning Center" },
  customer:     { label: "Customer Portal",        subtitle: "My Services" },
  expert:       { label: "Expert Portal",          subtitle: "Service Delivery" },
  "school-admin": { label: "Language School",     subtitle: "School Administration" },
  "project-partner": { label: "Project Partner Portal", subtitle: "Collaboration Hub" },
  "job-seeker": { label: "Job Seeker Console",    subtitle: "Career Hub" },
  "job-partner": { label: "Job Partner Portal",    subtitle: "Recruitment Dashboard" },
  "ausbildung-seeker": { label: "Ausbildung Seeker",  subtitle: "Vocational Console" },
  "ausbildung-partner": { label: "Ausbildung Partner", subtitle: "Training Academy" },
  sccg:         { label: "SCCG Career Lab",       subtitle: "Operations Console" },
};

// ============================================================
// Default Menu Definitions Per Console
// ============================================================

const PARTNER_MENU: MenuItem[] = [
  // Main Console
  { key: "partner.dashboard",       label: "Dashboard",          href: "/partner/dashboard",         icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "partner.candidates",      label: "Candidate Gallery",  href: "/partner/candidates",        icon: "Users",           group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: true },
  { key: "partner.candidates.new",  label: "Register Candidate", href: "/partner/candidates/new",    icon: "UserPlus",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.offers",          label: "Create Offer",       href: "/partner/offers",            icon: "Handshake",       group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.tasks",           label: "My Tasks",           href: "/partner/tasks",             icon: "ClipboardList",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.b2b",             label: "My B2B Network",     href: "/partner/b2b",               icon: "Building2",       group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.bookings",        label: "Bookings & Leads",   href: "/sales/bookings",            icon: "CalendarCheck",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 7, isEnabled: false, isDefault: false, isLocked: true },

  // Finance
  { key: "partner.finance",         label: "Finance Overview",   href: "/partner/finance",           icon: "DollarSign",      group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.finance.revenue", label: "My Revenue",         href: "/partner/finance/revenue",   icon: "TrendingUp",      group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.finance.due",     label: "Due Payments",       href: "/partner/finance/due-payments", icon: "AlertCircle",  group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.finance.invoices",label: "Invoices",           href: "/partner/finance/invoices",  icon: "FileText",        group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.finance.payments",label: "Make Payment",       href: "/partner/finance/payments",  icon: "CreditCard",      group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.finance.refunds", label: "Refund Requests",    href: "/partner/finance/refunds",   icon: "RotateCcw",       group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },

  // Marketplace
  { key: "partner.marketplace",     label: "Marketplace",        href: "/partner/marketplace",       icon: "ShoppingBag",     group: "marketplace",groupLabel: "Marketplace",        groupOrder: 3, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },

  // Account & Support
  { key: "partner.settings",        label: "Account Settings",   href: "/partner/settings",          icon: "Settings",        group: "account",    groupLabel: "Account",            groupOrder: 4, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.support",         label: "Support / Helpdesk", href: "/partner/support",           icon: "LifeBuoy",        group: "account",    groupLabel: "Account",            groupOrder: 4, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "partner.manual",          label: "User Manual",         href: "/user-manual",               icon: "BookOpen",        group: "account",    groupLabel: "Account",            groupOrder: 4, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
];

const ADMIN_MENU: MenuItem[] = [
  // Main Console
  { key: "admin.dashboard",         label: "Dashboard",          href: "/admin/dashboard",           icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "admin.overview",          label: "System Overview",    href: "/admin/overview",            icon: "BarChart3",       group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.tasks",             label: "Task Board",         href: "/admin/tasks",               icon: "ClipboardList",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.dev-board",         label: "Project Dev Board",  href: "/admin/dev-board",           icon: "FolderGit2",      group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },

  // Job & Ausbildung Systems
  { key: "admin.cv-bank",            label: "CV Master Bank",       href: "/admin/cv-bank",             icon: "Database",        group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.cv-suite",           label: "CV Suite Variations",  href: "/admin/cv-suite",            icon: "Layers",          group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.cv-maker",           label: "CV Maker",             href: "/admin/cv-maker",            icon: "FileEdit",        group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 2.5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.cover-letters",      label: "Cover Letters",        href: "/admin/cover-letters",       icon: "FileText",        group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.trackers",           label: "Kanban Trackers",      href: "/admin/trackers",            icon: "FolderKanban",    group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.job-partners",       label: "Job Partners",         href: "/admin/job-partners",        icon: "Building2",       group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ausbildung-partners", label: "Ausbildung Partners",  href: "/admin/ausbildung-partners", icon: "GraduationCap",   group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.gdpr",               label: "GDPR Compliance",      href: "/admin/gdpr",                icon: "ShieldAlert",     group: "jobs",       groupLabel: "Job & Ausbildung",   groupOrder: 1.5, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },

  // Partner Management
  { key: "admin.approvals",         label: "Approvals",          href: "/admin/approvals",           icon: "ClipboardCheck",  group: "partners",   groupLabel: "Partner Management", groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.partners",          label: "Manage Partners",    href: "/admin/partners",            icon: "Shield",          group: "partners",   groupLabel: "Partner Management", groupOrder: 2, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.candidates",        label: "All Candidates",     href: "/admin/candidates",          icon: "Users",           group: "partners",   groupLabel: "Partner Management", groupOrder: 2, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.projects",          label: "Project Partners",   href: "/admin/projects",            icon: "FolderKanban",    group: "partners",   groupLabel: "Partner Management", groupOrder: 2, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },

  // Project Partner AI (renders inside the admin console; admin has full cross-org access)
  { key: "admin.ppms.projects",     label: "PP Projects",        href: "/admin/ppms/projects",   icon: "FolderCog",         group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.evaluation-matrix", label: "Evaluation Matrix", href: "/admin/ppms/evaluation-matrix", icon: "BarChart3", group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 1.5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.tor",          label: "ToR Analyzer (AI)",  href: "/admin/ppms/tor",        icon: "FileSearch",        group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.intake",       label: "CV Intake (AI)",     href: "/admin/ppms/intake",     icon: "Sparkles",          group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.review",       label: "Scoring Review",     href: "/admin/ppms/review",     icon: "ClipboardCheck",    group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.reports",      label: "Report Drafts (AI)", href: "/admin/ppms/reports",    icon: "FileText",          group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.evalsetup",    label: "Evaluation Setup",   href: "/admin/ppms/evaluation", icon: "SlidersHorizontal", group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.activity",     label: "AI Activity",        href: "/admin/ppms/activity",   icon: "Activity",          group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.ppms.org",          label: "Organisations",      href: "/admin/ppms/org",        icon: "Building2",         group: "ppms", groupLabel: "Project Partner AI", groupOrder: 2.5, itemOrder: 8, isEnabled: true, isDefault: true, isLocked: false },

  // CV Tailor — separate feature with Python FastAPI backend
  { key: "admin.tor-library",       label: "ToR Library",        href: "/admin/tor-library",     icon: "ScrollText",        group: "cv-tailor", groupLabel: "CV Tailoring", groupOrder: 2.6, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.cv-tailor",         label: "CV Tailor (AI)",     href: "/admin/cv-tailor",       icon: "FilePen",           group: "cv-tailor", groupLabel: "CV Tailoring", groupOrder: 2.6, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.expert-bank",       label: "Master Expert Bank", href: "/admin/expert-bank",     icon: "Database",          group: "cv-tailor", groupLabel: "CV Tailoring", groupOrder: 2.6, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.eval-wizard",       label: "Evaluation Wizard",  href: "/admin/evaluation-wizard", icon: "ClipboardCheck",  group: "cv-tailor", groupLabel: "CV Tailoring", groupOrder: 2.6, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.cv-wizard",         label: "CV Creation Wizard", href: "/admin/cv-wizard",         icon: "FilePen",         group: "cv-tailor", groupLabel: "CV Tailoring", groupOrder: 2.6, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.word-compressor",   label: "Word Compressor",    href: "/admin/word-compressor",     icon: "FileArchive",     group: "cv-tailor", groupLabel: "CV Tailoring", groupOrder: 2.6, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },

  // Users
  { key: "admin.users",             label: "Manage Users",       href: "/admin/users",               icon: "Users",           group: "users",      groupLabel: "User Management",    groupOrder: 3, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.customers",         label: "Customers",          href: "/admin/customers",           icon: "Users",           group: "users",      groupLabel: "User Management",    groupOrder: 3, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.experts",           label: "Experts",            href: "/admin/experts",             icon: "UserCheck",       group: "users",      groupLabel: "User Management",    groupOrder: 3, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },

  // Sales & CRM
  { key: "admin.products",          label: "Manage Products",    href: "/admin/products",            icon: "Package",         group: "sales",      groupLabel: "Sales & CRM",        groupOrder: 4, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.register",          label: "Register Candidate", href: "/admin/candidates/new",      icon: "UserPlus",        group: "sales",      groupLabel: "Sales & CRM",        groupOrder: 4, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.orders",            label: "All Orders",         href: "/admin/orders",              icon: "ShoppingCart",    group: "sales",      groupLabel: "Sales & CRM",        groupOrder: 4, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.sessions",          label: "All Sessions",       href: "/admin/sessions",            icon: "Calendar",        group: "sales",      groupLabel: "Sales & CRM",        groupOrder: 4, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.bookings",          label: "Bookings & Leads",   href: "/sales/bookings",            icon: "CalendarCheck",   group: "sales",      groupLabel: "Sales & CRM",        groupOrder: 4, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },

  // Finance
  { key: "admin.financials",        label: "Global Financials",  href: "/admin/financials",          icon: "DollarSign",      group: "finance",    groupLabel: "Finance",            groupOrder: 5, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.invoices",          label: "Invoices",           href: "/admin/invoices",            icon: "FileText",        group: "finance",    groupLabel: "Finance",            groupOrder: 5, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.payments",          label: "Payments",           href: "/admin/payments",            icon: "DollarSign",      group: "finance",    groupLabel: "Finance",            groupOrder: 5, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.payouts",           label: "Payouts",            href: "/admin/payouts",             icon: "Wallet",          group: "finance",    groupLabel: "Finance",            groupOrder: 5, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.expert-payments",   label: "Expert Payments",    href: "/admin/expert-payments",     icon: "CreditCard",      group: "finance",    groupLabel: "Finance",            groupOrder: 5, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.reports",           label: "Financial Reports",  href: "/admin/reports",             icon: "BarChart3",       group: "finance",    groupLabel: "Finance",            groupOrder: 5, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },

  // Wallet & Rewards
  { key: "admin.wallets",           label: "Manage Wallets",     href: "/admin/wallets",             icon: "Wallet",          group: "wallet",     groupLabel: "Wallet & Rewards",   groupOrder: 6, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.sccg-cards",        label: "SCCG Cards",         href: "/admin/sccg-cards",          icon: "CreditCard",      group: "wallet",     groupLabel: "Wallet & Rewards",   groupOrder: 6, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.gift-cards",        label: "Gift Cards",         href: "/admin/gift-cards",          icon: "Gift",            group: "wallet",     groupLabel: "Wallet & Rewards",   groupOrder: 6, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },

  // Marketing
  { key: "admin.promo-codes",       label: "Promo Codes",        href: "/admin/promo-codes",         icon: "Tag",             group: "marketing",  groupLabel: "Marketing",          groupOrder: 7, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.promotions",        label: "Promotions",         href: "/admin/promotions",          icon: "Megaphone",       group: "marketing",  groupLabel: "Marketing",          groupOrder: 7, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.referrals",         label: "Referrals",          href: "/admin/referrals",           icon: "Share2",          group: "marketing",  groupLabel: "Marketing",          groupOrder: 7, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.commission-rules",  label: "Commission Rules",   href: "/admin/commission-rules",    icon: "DollarSign",      group: "marketing",  groupLabel: "Marketing",          groupOrder: 7, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.commissions",       label: "Commission Ledger",  href: "/admin/commissions",         icon: "FileText",        group: "marketing",  groupLabel: "Marketing",          groupOrder: 7, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },

  // HR
  { key: "admin.hr",                label: "HR Dashboard",       href: "/admin/hr",                  icon: "Building2",       group: "hr",         groupLabel: "Human Resources",    groupOrder: 8, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.hr.employees",      label: "Employees",          href: "/admin/hr/employees",        icon: "Users",           group: "hr",         groupLabel: "Human Resources",    groupOrder: 8, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },

  // School
  { key: "admin.school",            label: "School Dashboard",   href: "/admin/school",              icon: "GraduationCap",   group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.courses",    label: "Courses",            href: "/admin/school/courses",      icon: "BookOpen",        group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.batches",    label: "Batches",            href: "/admin/school/batches",      icon: "Layers",          group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.enrollments",label: "Enrollments",        href: "/admin/school/enrollments",  icon: "ClipboardList",   group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.teachers",   label: "Teachers",           href: "/admin/school/teachers",     icon: "UserCheck",       group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.certs",      label: "Certificates",       href: "/admin/school/certificates", icon: "Award",           group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.students",   label: "All Students",       href: "/admin/school/students",     icon: "Users",           group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.model-tests", label: "Model Tests",       href: "/admin/school/model-tests",  icon: "ClipboardCheck",  group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 8, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.school.model-test-builder", label: "Test Builder", href: "/admin/school/model-tests/builder", icon: "Wand2",   group: "school",     groupLabel: "Language School",    groupOrder: 9, itemOrder: 9, isEnabled: true, isDefault: true, isLocked: false },

  // Administration
  { key: "admin.send-email",        label: "Send Email",         href: "/admin/send-email",          icon: "Mail",            group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.onedrive-to-telegram", label: "OneDrive to Telegram", href: "/admin/onedrive-to-telegram", icon: "Send", group: "admin", groupLabel: "Administration", groupOrder: 10, itemOrder: 1.5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.email-templates",   label: "Email Templates",    href: "/admin/email-templates",     icon: "FileText",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.helpdesk",          label: "Helpdesk",           href: "/admin/helpdesk",            icon: "LifeBuoy",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.menu-config",       label: "Menu Configuration", href: "/admin/menu-config",         icon: "Settings",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: true },
  { key: "admin.data-sources",      label: "Data Sources",       href: "/admin/data-sources",        icon: "Database",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.activity-log",      label: "Activity Log",       href: "/admin/activity-log",        icon: "ScrollText",      group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.manual",            label: "User Manual",         href: "/user-manual",               icon: "BookOpen",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },
];

const CUSTOMER_MENU: MenuItem[] = [
  { key: "customer.dashboard",      label: "Dashboard",          href: "/customer/dashboard",        icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "customer.offers",         label: "My Offers",          href: "/customer/offers",           icon: "FileText",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.timeline",       label: "My Timeline",        href: "/customer/timeline",         icon: "ClipboardList",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.packages",       label: "My Packages",        href: "/customer/packages",         icon: "Package",         group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.courses",        label: "My Courses",         href: "/customer/school",           icon: "GraduationCap",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.sessions",       label: "Sessions",           href: "/customer/sessions",         icon: "Calendar",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.messages",       label: "Messages",           href: "/customer/messages",         icon: "MessageSquare",   group: "communication", groupLabel: "Communication",   groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.payments",       label: "Payments",           href: "/customer/payments",         icon: "CreditCard",      group: "finance",    groupLabel: "Finance",            groupOrder: 3, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.invoices",       label: "Invoices",           href: "/customer/invoices",         icon: "FileText",        group: "finance",    groupLabel: "Finance",            groupOrder: 3, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.notifications",  label: "Notifications",      href: "/customer/notifications",    icon: "Bell",            group: "account",    groupLabel: "Account",            groupOrder: 4, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.career",         label: "Career Suggestions", href: "/customer/career",           icon: "Sparkles",        group: "account",    groupLabel: "Account",            groupOrder: 4, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "customer.manual",         label: "User Manual",         href: "/user-manual",               icon: "BookOpen",        group: "account",    groupLabel: "Account",            groupOrder: 4, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
];

const EXPERT_MENU: MenuItem[] = [
  { key: "expert.dashboard",        label: "Dashboard",          href: "/expert/dashboard",          icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "expert.clients",          label: "My Clients",         href: "/expert/clients",            icon: "Users",           group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.sessions",         label: "Sessions",           href: "/expert/sessions",           icon: "Calendar",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.teaching",         label: "My Teaching",        href: "/expert/teaching",           icon: "BookOpen",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.payments",         label: "My Earnings",        href: "/expert/payments",           icon: "CreditCard",      group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.notifications",    label: "Notifications",      href: "/expert/notifications",      icon: "Bell",            group: "account",    groupLabel: "Account",            groupOrder: 3, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },  { key: "expert.manual",           label: "User Manual",         href: "/user-manual",               icon: "BookOpen",        group: "account",    groupLabel: "Account",            groupOrder: 3, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },];

const STUDENT_MENU: MenuItem[] = [
  { key: "student.dashboard",       label: "Dashboard",          href: "/student/dashboard",         icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "student.courses",         label: "My Courses",         href: "/student/courses",           icon: "GraduationCap",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "student.progress",        label: "Progress",           href: "/student/progress",          icon: "TrendingUp",      group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "student.documents",       label: "Documents",          href: "/student/documents",         icon: "FileText",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "student.model-tests",     label: "Model Tests",        href: "/student/model-tests",       icon: "ClipboardCheck",  group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },  { key: "student.manual",          label: "User Manual",         href: "/user-manual",               icon: "BookOpen",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },];

// School Admin — only school-related pages
const SCHOOL_ADMIN_MENU: MenuItem[] = [
  // Overview
  { key: "school.dashboard",         label: "School Dashboard",   href: "/admin/school",              icon: "GraduationCap",   group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  // Courses
  { key: "school.courses",           label: "Courses",            href: "/admin/school/courses",      icon: "BookOpen",        group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  // Batches
  { key: "school.batches",           label: "Batches",            href: "/admin/school/batches",      icon: "Layers",          group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  // Enrollments
  { key: "school.enrollments",       label: "Enrollments",        href: "/admin/school/enrollments",  icon: "ClipboardList",   group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  // Teachers
  { key: "school.teachers",          label: "Teachers",           href: "/admin/school/teachers",     icon: "UserCheck",       group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  // Certificates
  { key: "school.certificates",      label: "Certificates",       href: "/admin/school/certificates", icon: "Award",           group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  // Reports
  { key: "school.reports",           label: "School Reports",     href: "/admin/school/reports",      icon: "BarChart3",       group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },
  // Students
  { key: "school.students",          label: "All Students",       href: "/admin/school/students",     icon: "Users",           group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 8, isEnabled: true, isDefault: true, isLocked: false },
  // Model Tests
  { key: "school.model-tests",       label: "Model Tests",        href: "/admin/school/model-tests",  icon: "ClipboardCheck",  group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 9, isEnabled: true, isDefault: true, isLocked: false },
  { key: "school.model-test-builder", label: "Test Builder",     href: "/admin/school/model-tests/builder", icon: "Wand2",   group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 10, isEnabled: true, isDefault: true, isLocked: false },  { key: "school.manual",           label: "User Manual",         href: "/user-manual",               icon: "BookOpen",        group: "school",     groupLabel: "Language School",    groupOrder: 1, itemOrder: 11, isEnabled: true, isDefault: true, isLocked: false },];

const PROJECT_PARTNER_MENU: MenuItem[] = [
  { key: "pp.dashboard",  label: "Dashboard",        href: "/project-partner/dashboard", icon: "LayoutDashboard", group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "pp.matrix",     label: "Staffing Matrix",  href: "/project-partner/matrix",    icon: "Table2",          group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 2, isEnabled: false, isDefault: true, isLocked: false },
  { key: "pp.evaluation", label: "Evaluation Matrix", href: "/project-partner/evaluation", icon: "BarChart3",       group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "pp.experts",    label: "Available Experts", href: "/project-partner/experts",   icon: "UsersRound",      group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "pp.projects",   label: "Projects Files",   href: "/project-partner/projects",  icon: "FolderKanban",    group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },

  // Management group — only visible to project-partner-admin (org admin) + SCCG admin.
  // ConsoleShell filters "ppa.*" keys out for read-only viewers.
  { key: "ppa.manage",     label: "Manage Projects",   href: "/project-partner/manage/projects",     icon: "FolderCog",    group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.tor",        label: "ToR Analyzer (AI)", href: "/project-partner/manage/tor",          icon: "FileSearch",   group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.intake",     label: "CV Intake (AI)",    href: "/project-partner/manage/intake",       icon: "Sparkles",     group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.review",     label: "Scoring Review",    href: "/project-partner/manage/review",       icon: "ClipboardCheck", group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.reports",    label: "Report Drafts (AI)",href: "/project-partner/manage/reports",      icon: "FileText",     group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.evalsetup",  label: "Evaluation Setup",  href: "/project-partner/manage/evaluation",   icon: "SlidersHorizontal", group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.activity",   label: "AI Activity",       href: "/project-partner/manage/activity",     icon: "Activity",     group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.users",      label: "Project Partners",  href: "/project-partner/manage/users",        icon: "UsersRound",   group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 8, isEnabled: true, isDefault: true, isLocked: false },
  { key: "ppa.org",        label: "Organisation",      href: "/project-partner/manage/org",          icon: "Building2",    group: "manage", groupLabel: "Management", groupOrder: 2, itemOrder: 9, isEnabled: true, isDefault: true, isLocked: false },
];

/** Menu keys that only org admins (project-partner-admin) or SCCG admins may see. */
export function isManagementMenuKey(key: string): boolean {
  return key.startsWith("ppa.");
}

const JOB_SEEKER_MENU: MenuItem[] = [
  { key: "jobseeker.dashboard",    label: "Dashboard",          href: "/job-seeker/dashboard",      icon: "LayoutDashboard", group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "jobseeker.cv",           label: "My CV Suite",        href: "/job-seeker/cv-editor",      icon: "FileText",         group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: true },
  { key: "jobseeker.coverletter",  label: "Anschreiben",        href: "/job-seeker/cover-letter",   icon: "FilePen",        group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "jobseeker.tracker",      label: "Kanban Tracker",     href: "/job-seeker/tracker",        icon: "Kanban",          group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
];

const JOB_PARTNER_MENU: MenuItem[] = [
  { key: "jobpartner.dashboard",   label: "Dashboard",          href: "/job-partner/dashboard",     icon: "LayoutDashboard", group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "jobpartner.post",        label: "Post Job",           href: "/job-partner/post-job",      icon: "PlusCircle",      group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "jobpartner.cvbank",      label: "CV Master Bank",     href: "/job-partner/cv-bank",       icon: "Database",        group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
];

const AUSBILDUNG_SEEKER_MENU: MenuItem[] = [
  { key: "ausseeker.dashboard",    label: "Dashboard",          href: "/ausbildung/seeker/dashboard", icon: "LayoutDashboard", group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "ausseeker.diagnostic",   label: "Test Status",        href: "/ausbildung/seeker/diagnostic", icon: "ClipboardCheck", group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: true },
];

const AUSBILDUNG_PARTNER_MENU: MenuItem[] = [
  { key: "auspartner.dashboard",   label: "Dashboard",          href: "/ausbildung/partner/dashboard", icon: "LayoutDashboard", group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "auspartner.applicants",  label: "Applicants",         href: "/ausbildung/partner/applicants", icon: "Users",          group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
];

// ============================================================
// SCCG Career Lab console (SCCG Admin + SCCG Staff)
// Reuses existing /admin/* pages. Items flagged `adminOnly` are
// hidden from SCCG Staff (Partner Management, Finance, Administration).
// Order matches the requirement doc's operational preference exactly.
// ============================================================
const SCCG_MENU: MenuItem[] = [
  // Main Console
  { key: "sccg.dashboard",   label: "Dashboard",         href: "/sccg/dashboard", icon: "LayoutDashboard", group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "sccg.tasks",       label: "Task Board",        href: "/sccg/tasks",     icon: "ClipboardList",   group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.dev-board",   label: "Project Dev Board", href: "/sccg/dev-board", icon: "FolderGit2",      group: "main", groupLabel: "Main Console", groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },

  // 1. Candidate Gallery
  { key: "sccg.candidates",           label: "Candidate Gallery",       href: "/sccg/candidates",     icon: "Users",    group: "candidates", groupLabel: "Candidate Gallery", groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.candidates.new",       label: "Register a Candidate",    href: "/sccg/candidates/new", icon: "UserPlus", group: "candidates", groupLabel: "Candidate Gallery", groupOrder: 2, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.offers",               label: "Create Offer",            href: "/sccg/offers",          icon: "Handshake",group: "candidates", groupLabel: "Candidate Gallery", groupOrder: 2, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.candidates.successful",label: "Successful Candidates",   href: "/sccg/candidates/successful", icon: "Trophy", group: "candidates", groupLabel: "Candidate Gallery", groupOrder: 2, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },

  // 2. CV Module
  { key: "sccg.cv-maker",       label: "Create CV",             href: "/admin/cv-maker",       icon: "FileEdit",     group: "cv", groupLabel: "CV Module", groupOrder: 2.5, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.cover-letters",  label: "Cover Letters",         href: "/admin/cover-letters",  icon: "FileText",     group: "cv", groupLabel: "CV Module", groupOrder: 2.5, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.cv-tailor",      label: "CV Tailor (AI)",        href: "/admin/cv-tailor",      icon: "FilePen",      group: "cv", groupLabel: "CV Module", groupOrder: 2.5, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.cv-bank",        label: "CV Master Bank",        href: "/admin/cv-bank",        icon: "Database",     group: "cv", groupLabel: "CV Module", groupOrder: 2.5, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.cv-suite",       label: "CV Suite Variations",   href: "/admin/cv-suite",       icon: "Layers",       group: "cv", groupLabel: "CV Module", groupOrder: 2.5, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },

  // 3. Operation
  { key: "sccg.timeline",       label: "Client Service Timeline",href: "/sccg/timeline",       icon: "GanttChartSquare", group: "operation", groupLabel: "Operation", groupOrder: 3, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.assign-expert",  label: "Assign Expert",         href: "/sccg/assign-expert",   icon: "UserCheck",    group: "operation", groupLabel: "Operation", groupOrder: 3, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.sessions",       label: "Expert Session Overview",href: "/sccg/sessions",       icon: "CalendarClock",group: "operation", groupLabel: "Operation", groupOrder: 3, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },

  // 4. Candidate Bank
  { key: "sccg.gdpr",      label: "GDPR Compliance",       href: "/admin/gdpr",     icon: "ShieldAlert", group: "bank", groupLabel: "Candidate Bank", groupOrder: 4, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.sharing",   label: "Share with Partner",    href: "/sccg/share",     icon: "Share2",      group: "bank", groupLabel: "Candidate Bank", groupOrder: 4, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },

  // 4. Partner Management (Admin only)
  { key: "sccg.partners",    label: "Manage Partner",     href: "/admin/partners",  icon: "Shield",         group: "partners", groupLabel: "Partner Management", groupOrder: 5, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },
  { key: "sccg.partner-performance", label: "Partner Performance", href: "/sccg/partner-performance", icon: "ChartNoAxesCombined", group: "partners", groupLabel: "Partner Management", groupOrder: 5, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },
  { key: "sccg.approvals",   label: "Approval",           href: "/admin/approvals", icon: "ClipboardCheck", group: "partners", groupLabel: "Partner Management", groupOrder: 5, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },
  { key: "sccg.projects",    label: "Project Partner",    href: "/admin/projects",  icon: "FolderKanban",   group: "partners", groupLabel: "Partner Management", groupOrder: 5, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },

  // 5. Sales & Marketing
  { key: "sccg.products",    label: "Manage Product",         href: "/admin/products",   icon: "Package",       group: "sales", groupLabel: "Sales & Marketing", groupOrder: 6, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.bookings",    label: "Booking & Lead",         href: "/sales/bookings",   icon: "CalendarCheck", group: "sales", groupLabel: "Sales & Marketing", groupOrder: 6, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.promotions",  label: "Current Campaign",       href: "/admin/promotions", icon: "Megaphone",     group: "sales", groupLabel: "Sales & Marketing", groupOrder: 6, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.promo-codes", label: "Promo Codes",            href: "/admin/promo-codes",icon: "Tag",           group: "sales", groupLabel: "Sales & Marketing", groupOrder: 6, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.marketing-materials", label: "Marketing Materials", href: "/sccg/marketing-materials", icon: "FolderOpen", group: "sales", groupLabel: "Sales & Marketing", groupOrder: 6, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },

  // 6. Finance
  { key: "sccg.financials", label: "Finance Overview", href: "/sccg/finance", icon: "DollarSign", group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.invoices",   label: "Invoices",         href: "/sccg/finance/invoices",   icon: "FileText",   group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.payments",   label: "Payments",         href: "/sccg/finance/payments",   icon: "CreditCard", group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.payouts",    label: "Payout",           href: "/sccg/finance/payouts",    icon: "Wallet",     group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.expert-payments", label: "Expert Payment", href: "/sccg/expert-payments", icon: "HandCoins", group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.refunds",    label: "Refund",           href: "/sccg/refunds",     icon: "Undo2",      group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.expenses",   label: "Expenses",         href: "/sccg/finance/expenses", icon: "ReceiptText", group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.reports",    label: "Reports",          href: "/sccg/finance/reports",    icon: "BarChart3",  group: "finance", groupLabel: "Finance", groupOrder: 7, itemOrder: 8, isEnabled: true, isDefault: true, isLocked: false },

  // 7. Human Resource
  { key: "sccg.hr", label: "HR Dashboard", href: "/sccg/hr", icon: "Building2", group: "hr", groupLabel: "Human Resource", groupOrder: 8, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.hr.employees", label: "Employees", href: "/sccg/hr/employees", icon: "Users", group: "hr", groupLabel: "Human Resource", groupOrder: 8, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },

  // 8. Language School
  { key: "sccg.school", label: "School Dashboard", href: "/sccg/school", icon: "GraduationCap", group: "school", groupLabel: "Language School", groupOrder: 9, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.school.courses", label: "Courses", href: "/sccg/school/courses", icon: "BookOpen", group: "school", groupLabel: "Language School", groupOrder: 9, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.school.batches", label: "Batches", href: "/sccg/school/batches", icon: "Layers", group: "school", groupLabel: "Language School", groupOrder: 9, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.school.students", label: "Students", href: "/sccg/school/students", icon: "Users", group: "school", groupLabel: "Language School", groupOrder: 9, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.school.waiting-list", label: "Waiting List", href: "/sccg/school/waiting-list", icon: "Hourglass", group: "school", groupLabel: "Language School", groupOrder: 9, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.school.team", label: "Language Team", href: "/sccg/school/team", icon: "UserCheck", group: "school", groupLabel: "Language School", groupOrder: 9, itemOrder: 6, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.school.certificates", label: "Certificates", href: "/sccg/school/certificates", icon: "Award", group: "school", groupLabel: "Language School", groupOrder: 9, itemOrder: 7, isEnabled: true, isDefault: true, isLocked: false },

  // 9. Wallet & Rewards
  { key: "sccg.wallets",    label: "Manage Wallets", href: "/admin/wallets",    icon: "Wallet",     group: "wallet", groupLabel: "Wallet & Rewards", groupOrder: 10, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.gift-cards", label: "Gift Cards",     href: "/admin/gift-cards", icon: "Gift",       group: "wallet", groupLabel: "Wallet & Rewards", groupOrder: 10, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "sccg.sccg-cards", label: "SCCG Cards",     href: "/admin/sccg-cards", icon: "CreditCard", group: "wallet", groupLabel: "Wallet & Rewards", groupOrder: 10, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },

  // 10. Administration (Admin only)
  { key: "sccg.users",        label: "User Management",     href: "/admin/users",        icon: "Users",     group: "admin", groupLabel: "Administration", groupOrder: 11, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },
  { key: "sccg.menu-config",  label: "Role & Access",       href: "/sccg/access-control", icon: "Settings",  group: "admin", groupLabel: "Administration", groupOrder: 11, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },
  { key: "sccg.activity-log", label: "User Activity Log",   href: "/admin/activity-log", icon: "ScrollText",group: "admin", groupLabel: "Administration", groupOrder: 11, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },
  { key: "sccg.data-sources", label: "System Settings",     href: "/admin/data-sources", icon: "Database",  group: "admin", groupLabel: "Administration", groupOrder: 11, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false, adminOnly: true },
];

/** Registry of all default menus by console */
export const DEFAULT_MENUS: Record<ConsoleType, MenuItem[]> = {
  partner:        PARTNER_MENU,
  admin:          ADMIN_MENU,
  sccg:           SCCG_MENU,
  customer:       CUSTOMER_MENU,
  expert:         EXPERT_MENU,
  student:        STUDENT_MENU,
  "school-admin": SCHOOL_ADMIN_MENU,
  "project-partner": PROJECT_PARTNER_MENU,
  "job-seeker":   JOB_SEEKER_MENU,
  "job-partner":  JOB_PARTNER_MENU,
  "ausbildung-seeker": AUSBILDUNG_SEEKER_MENU,
  "ausbildung-partner": AUSBILDUNG_PARTNER_MENU,
};

/** Flat list of ALL available menu items across all consoles (for admin config UI) */
export function getAllAvailableMenuItems(): MenuItem[] {
  return Object.values(DEFAULT_MENUS).flat();
}

// ============================================================
// Console Resolution
// ============================================================

/** Given a user's roles array, determine their primary console */
export function resolveConsole(roles: string[]): ConsoleType {
  const lower = roles.map((r) => r.toLowerCase());
  if (lower.includes("admin") || lower.includes("project-admin")) return "admin";
  if (lower.includes("sccg-admin") || lower.includes("sccg-staff")) return "sccg";
  if (lower.includes("school-manager")) return "school-admin";
  if (lower.includes("project-partner") || lower.includes("project-partner-admin")) return "project-partner";
  if (lower.includes("job-seeker")) return "job-seeker";
  if (lower.includes("job-partner")) return "job-partner";
  if (lower.includes("ausbildung-seeker")) return "ausbildung-seeker";
  if (lower.includes("ausbildung-partner")) return "ausbildung-partner";
  if (lower.some((r) => ["partner", "partner-individual", "partner-institutional"].includes(r))) return "partner";
  if (lower.includes("expert") || lower.includes("teacher")) return "expert";
  if (lower.includes("customer")) return "customer";
  if (lower.includes("student")) return "student";
  return "partner"; // fallback
}

// ============================================================
// Menu Resolution (with DB override support)
// ============================================================

/**
 * Menu keys whose target routes are not implemented yet (would 404).
 * These are hidden from every sidebar so users only ever see working links.
 * When the corresponding page is built under src/app, remove its key here.
 */
export const UNAVAILABLE_MENU_KEYS = new Set<string>([
  // Admin → Project Partner AI (PPMS) — no /admin/ppms/* pages exist
  "admin.ppms.projects",
  "admin.ppms.evaluation-matrix",
  "admin.ppms.tor",
  "admin.ppms.intake",
  "admin.ppms.review",
  "admin.ppms.reports",
  "admin.ppms.evalsetup",
  "admin.ppms.activity",
  "admin.ppms.org",
  // Admin — misc routes without a page
  "admin.register",         // /admin/candidates/new
  "admin.sessions",         // /admin/sessions
  "admin.expert-payments",  // /admin/expert-payments
  "admin.commissions",      // /admin/commissions
  "admin.hr.employees",     // /admin/hr/employees
  // Admin → Language School sub-pages (only /admin/school dashboard exists)
  "admin.school.courses",
  "admin.school.batches",
  "admin.school.enrollments",
  "admin.school.teachers",
  "admin.school.certs",
  "admin.school.students",
  "admin.school.model-tests",
  "admin.school.model-test-builder",
  // Student console sub-pages without a page
  "student.courses",
  "student.progress",
  "student.documents",
  // School-admin console — same missing /admin/school/* targets
  "school.courses",
  "school.batches",
  "school.enrollments",
  "school.teachers",
  "school.certificates",
  "school.reports",
  "school.students",
  "school.model-tests",
  "school.model-test-builder",
  // SCCG console — routes phased in later (Phase 1/2)
  "sccg.offers",                  // /sccg/offers
]);

/**
 * Resolve the final menu for a given console and optional user overrides.
 * 
 * Priority:
 * 1. Load defaults for the console
 * 2. Apply role-level overrides from DB (enable/disable items)
 * 3. Apply user-level overrides from DB (enable/disable items, add extra items)
 * 
 * Returns only enabled items, sorted by groupOrder then itemOrder.
 */
export function resolveMenu(
  console: ConsoleType,
  roleOverrides?: MenuConfigRecord[],
  userOverrides?: MenuConfigRecord[],
): MenuItem[] {
  // Start with default menu for this console
  const defaults = [...DEFAULT_MENUS[console]];
  
  // Build a map for fast lookup
  const menuMap = new Map<string, MenuItem>();
  const catalog = new Map(getAllAvailableMenuItems().map((item) => [item.key, item]));
  for (const item of defaults) {
    menuMap.set(item.key, { ...item });
  }

  // Apply role-level overrides
  if (roleOverrides) {
    for (const override of roleOverrides) {
      const catalogItem = catalog.get(override.menuKey);
      if (!catalogItem) continue;
      if (menuMap.has(override.menuKey)) {
        // Update existing item
        const item = menuMap.get(override.menuKey)!;
        if (!item.isLocked) {
          item.isEnabled = override.isEnabled;
        }
        item.label = override.label || item.label;
        item.itemOrder = override.itemOrder ?? item.itemOrder;
        item.groupOrder = override.groupOrder ?? item.groupOrder;
      } else {
        menuMap.set(override.menuKey, {
          ...catalogItem,
          label: override.label || catalogItem.label,
          groupOrder: override.groupOrder ?? catalogItem.groupOrder,
          itemOrder: override.itemOrder ?? catalogItem.itemOrder,
          isEnabled: override.isEnabled,
        });
      }
    }
  }

  // Apply user-level overrides (highest priority)
  if (userOverrides) {
    for (const override of userOverrides) {
      const catalogItem = catalog.get(override.menuKey);
      if (!catalogItem) continue;
      if (menuMap.has(override.menuKey)) {
        const item = menuMap.get(override.menuKey)!;
        if (!item.isLocked) {
          item.isEnabled = override.isEnabled;
        }
        item.label = override.label || item.label;
        item.itemOrder = override.itemOrder ?? item.itemOrder;
      } else {
        menuMap.set(override.menuKey, {
          ...catalogItem,
          label: override.label || catalogItem.label,
          groupOrder: override.groupOrder ?? catalogItem.groupOrder,
          itemOrder: override.itemOrder ?? catalogItem.itemOrder,
          isEnabled: override.isEnabled,
        });
      }
    }
  }

  // Filter to enabled only, then sort. Also drop items whose target route
  // does not exist yet (would 404) so the sidebar only shows working links.
  return Array.from(menuMap.values())
    .filter((item) => item.isEnabled && !UNAVAILABLE_MENU_KEYS.has(item.key))
    .sort((a, b) => {
      if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
      return a.itemOrder - b.itemOrder;
    });
}

/**
 * Group menu items by their group key for sidebar rendering.
 */
export function groupMenuItems(items: MenuItem[]): { group: string; label: string; items: MenuItem[] }[] {
  const groups = new Map<string, { group: string; label: string; order: number; items: MenuItem[] }>();

  for (const item of items) {
    if (!groups.has(item.group)) {
      groups.set(item.group, {
        group: item.group,
        label: item.groupLabel,
        order: item.groupOrder,
        items: [],
      });
    }
    groups.get(item.group)!.items.push(item);
  }

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map(({ group, label, items }) => ({ group, label, items }));
}
