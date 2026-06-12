// ============================================================
// Menu Engine — Dynamic menu resolution for all consoles
// ============================================================
// Default menus are defined per console below.
// Admin can override via SharePoint "MenuConfig" list.
// Resolution: role defaults → merge user overrides → final menu.
// ============================================================

import type { UserRole } from "@/types";

export type ConsoleType = "partner" | "admin" | "student" | "customer" | "expert";

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
  partner:  { label: "Partner Portal",   subtitle: "Partner Console" },
  admin:    { label: "Admin Portal",     subtitle: "Administration" },
  student:  { label: "Student Portal",   subtitle: "Learning Center" },
  customer: { label: "Customer Portal",  subtitle: "My Services" },
  expert:   { label: "Expert Portal",    subtitle: "Service Delivery" },
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
  { key: "partner.bookings",        label: "Bookings & Leads",   href: "/sales/bookings",            icon: "CalendarCheck",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 6, isEnabled: false, isDefault: false, isLocked: true },

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
];

const ADMIN_MENU: MenuItem[] = [
  // Main Console
  { key: "admin.dashboard",         label: "Dashboard",          href: "/admin/dashboard",           icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "admin.overview",          label: "System Overview",    href: "/admin/overview",            icon: "BarChart3",       group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.tasks",             label: "Task Board",         href: "/admin/tasks",               icon: "ClipboardList",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },

  // Partner Management
  { key: "admin.approvals",         label: "Approvals",          href: "/admin/approvals",           icon: "ClipboardCheck",  group: "partners",   groupLabel: "Partner Management", groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.partners",          label: "Manage Partners",    href: "/admin/partners",            icon: "Shield",          group: "partners",   groupLabel: "Partner Management", groupOrder: 2, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.candidates",        label: "All Candidates",     href: "/admin/candidates",          icon: "Users",           group: "partners",   groupLabel: "Partner Management", groupOrder: 2, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },

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

  // Administration
  { key: "admin.send-email",        label: "Send Email",         href: "/admin/send-email",          icon: "Mail",            group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.email-templates",   label: "Email Templates",    href: "/admin/email-templates",     icon: "FileText",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.helpdesk",          label: "Helpdesk",           href: "/admin/helpdesk",            icon: "LifeBuoy",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "admin.menu-config",       label: "Menu Configuration", href: "/admin/menu-config",         icon: "Settings",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: true },
  { key: "admin.data-sources",      label: "Data Sources",       href: "/admin/data-sources",        icon: "Database",        group: "admin",      groupLabel: "Administration",     groupOrder: 10, itemOrder: 5, isEnabled: true, isDefault: true, isLocked: false },
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
];

const EXPERT_MENU: MenuItem[] = [
  { key: "expert.dashboard",        label: "Dashboard",          href: "/expert/dashboard",          icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "expert.clients",          label: "My Clients",         href: "/expert/clients",            icon: "Users",           group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.sessions",         label: "Sessions",           href: "/expert/sessions",           icon: "Calendar",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.teaching",         label: "My Teaching",        href: "/expert/teaching",           icon: "BookOpen",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.payments",         label: "My Earnings",        href: "/expert/payments",           icon: "CreditCard",      group: "finance",    groupLabel: "Finance",            groupOrder: 2, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
  { key: "expert.notifications",    label: "Notifications",      href: "/expert/notifications",      icon: "Bell",            group: "account",    groupLabel: "Account",            groupOrder: 3, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: false },
];

const STUDENT_MENU: MenuItem[] = [
  { key: "student.dashboard",       label: "Dashboard",          href: "/student/dashboard",         icon: "LayoutDashboard", group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 1, isEnabled: true, isDefault: true, isLocked: true },
  { key: "student.courses",         label: "My Courses",         href: "/student/courses",           icon: "GraduationCap",   group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 2, isEnabled: true, isDefault: true, isLocked: false },
  { key: "student.progress",        label: "Progress",           href: "/student/progress",          icon: "TrendingUp",      group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 3, isEnabled: true, isDefault: true, isLocked: false },
  { key: "student.documents",       label: "Documents",          href: "/student/documents",         icon: "FileText",        group: "main",       groupLabel: "Main Console",       groupOrder: 1, itemOrder: 4, isEnabled: true, isDefault: true, isLocked: false },
];

/** Registry of all default menus by console */
export const DEFAULT_MENUS: Record<ConsoleType, MenuItem[]> = {
  partner:  PARTNER_MENU,
  admin:    ADMIN_MENU,
  customer: CUSTOMER_MENU,
  expert:   EXPERT_MENU,
  student:  STUDENT_MENU,
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
  if (lower.includes("admin")) return "admin";
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
  for (const item of defaults) {
    menuMap.set(item.key, { ...item });
  }

  // Apply role-level overrides
  if (roleOverrides) {
    for (const override of roleOverrides) {
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
        // Add new item from override
        menuMap.set(override.menuKey, {
          key: override.menuKey,
          label: override.label,
          href: override.href,
          icon: override.icon,
          group: override.groupName,
          groupLabel: override.groupName,
          groupOrder: override.groupOrder,
          itemOrder: override.itemOrder,
          isEnabled: override.isEnabled,
          isDefault: false,
          isLocked: override.isLocked,
        });
      }
    }
  }

  // Apply user-level overrides (highest priority)
  if (userOverrides) {
    for (const override of userOverrides) {
      if (menuMap.has(override.menuKey)) {
        const item = menuMap.get(override.menuKey)!;
        if (!item.isLocked) {
          item.isEnabled = override.isEnabled;
        }
        item.label = override.label || item.label;
        item.itemOrder = override.itemOrder ?? item.itemOrder;
      } else {
        menuMap.set(override.menuKey, {
          key: override.menuKey,
          label: override.label,
          href: override.href,
          icon: override.icon,
          group: override.groupName,
          groupLabel: override.groupName,
          groupOrder: override.groupOrder,
          itemOrder: override.itemOrder,
          isEnabled: override.isEnabled,
          isDefault: false,
          isLocked: override.isLocked,
        });
      }
    }
  }

  // Filter to enabled only, then sort
  return Array.from(menuMap.values())
    .filter((item) => item.isEnabled)
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
