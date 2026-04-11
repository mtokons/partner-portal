"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Activity,
  DollarSign, Shield, BarChart3, FileText, Receipt, Handshake,
  UserCheck, Calendar, CreditCard, Zap, Mail, ChevronRight,
  FlaskConical, ClipboardList, Store, Tag, Share2, Wallet, User, X, ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  roles: string[];
  open: boolean;
  onClose: () => void;
}

interface LinkItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  roles: string[];
}

const allLinks: LinkItem[] = [
  // Main
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "main", roles: ["partner", "admin"] },
  { href: "/orders", label: "Orders", icon: ShoppingCart, group: "main", roles: ["partner"] },
  { href: "/clients", label: "Clients", icon: Users, group: "main", roles: ["partner"] },
  { href: "/activity", label: "Activity", icon: Activity, group: "main", roles: ["partner", "admin"] },
  // Sales Shop
  { href: "/shop", label: "Sales Shop", icon: Store, group: "shop", roles: ["partner", "admin"] },
  { href: "/sales/offers", label: "Sales Offers", icon: Handshake, group: "shop", roles: ["partner", "admin"] },
  { href: "/sales/orders", label: "Sales Orders", icon: ClipboardList, group: "shop", roles: ["partner", "admin"] },
  // Finance
  { href: "/financials", label: "P&L Overview", icon: DollarSign, group: "finance", roles: ["partner"] },
  { href: "/financials/expenses", label: "Expenses", icon: Receipt, group: "finance", roles: ["partner"] },
  { href: "/financials/invoices", label: "Invoices", icon: FileText, group: "finance", roles: ["partner"] },
  { href: "/financials/payouts", label: "My Payouts", icon: Wallet, group: "finance", roles: ["partner"] },
  // Wallet & rewards
  { href: "/wallets", label: "SCCG Wallet", icon: Wallet, group: "wallet", roles: ["partner"] },
  { href: "/referrals", label: "My Referral Code", icon: Share2, group: "wallet", roles: ["partner"] },
  { href: "/commissions", label: "My Commissions", icon: DollarSign, group: "wallet", roles: ["partner"] },
  // Admin
  { href: "/admin/overview", label: "Admin Overview", icon: BarChart3, group: "admin", roles: ["admin"] },
  { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck, group: "admin", roles: ["admin"] },
  { href: "/admin/partners", label: "Manage Partners", icon: Shield, group: "admin", roles: ["admin"] },
  { href: "/admin/customers", label: "Customers", icon: Users, group: "admin", roles: ["admin"] },
  { href: "/admin/experts", label: "Experts", icon: UserCheck, group: "admin", roles: ["admin"] },
  { href: "/admin/sessions", label: "All Sessions", icon: Calendar, group: "admin", roles: ["admin"] },
  { href: "/admin/expert-payments", label: "Expert Payments", icon: CreditCard, group: "admin", roles: ["admin"] },
  { href: "/admin/orders", label: "All Orders", icon: ShoppingCart, group: "admin", roles: ["admin"] },
  { href: "/admin/financials", label: "Global Financials", icon: DollarSign, group: "admin", roles: ["admin"] },
  { href: "/admin/referrals", label: "Referrals", icon: Share2, group: "admin", roles: ["admin"] },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet, group: "admin", roles: ["admin"] },
  { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag, group: "admin", roles: ["admin"] },
  { href: "/admin/commission-rules", label: "Commission Rules", icon: DollarSign, group: "admin", roles: ["admin"] },
  { href: "/admin/commissions", label: "Commission Ledger", icon: FileText, group: "admin", roles: ["admin"] },
  { href: "/admin/wallets", label: "Manage Wallets", icon: Wallet, group: "admin", roles: ["admin"] },
  { href: "/admin/gift-cards", label: "Gift Cards", icon: CreditCard, group: "admin", roles: ["admin"] },
  { href: "/admin/promotions", label: "Promotions", icon: Tag, group: "admin", roles: ["admin"] },
  { href: "/admin/products", label: "Manage Products", icon: Package, group: "admin", roles: ["admin"] },
  { href: "/admin/send-email", label: "Send Email", icon: Mail, group: "admin", roles: ["admin"] },
  // Account
  { href: "/profile", label: "My Profile", icon: User, group: "account", roles: ["partner", "admin"] },
  // Dev
  { href: "/sp-test", label: "SP CRUD Test", icon: FlaskConical, group: "dev", roles: ["admin"] },
];

const groupLabels: Record<string, string> = {
  main: "Main",
  shop: "Sales Shop",
  finance: "Finance",
  wallet: "Wallet & Rewards",
  admin: "Administration",
  account: "Account",
  dev: "Developer",
};

export default function Sidebar({ roles, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  // Filter by user's active roles and deduplicate
  const seen = new Set<string>();
  const links = allLinks.filter((l) => {
    if (!l.roles.some((r) => roles.includes(r))) return false;
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });

  const isAdmin = roles.includes("admin");
  const roleLabel = isAdmin ? "Admin" : roles.includes("partner") ? "Partner" : "User";

  // Compute groups in order
  const seenGroups = new Set<string>();
  const orderedGroups: string[] = [];
  links.forEach((l) => {
    if (!seenGroups.has(l.group)) { seenGroups.add(l.group); orderedGroups.push(l.group); }
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 sidebar-mesh text-sidebar-foreground flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:z-40",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Decorative border right */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(99,130,245,0.3)] to-transparent pointer-events-none" />

        {/* Brand */}
        <div className="p-6 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-2xl gradient-cosmic flex items-center justify-center shadow-lg">
                <Zap className="h-5 w-5 text-white drop-shadow" />
                <div className="absolute inset-0 rounded-2xl bg-white/10 shimmer" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold text-white tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                  Partner Portal
                </h1>
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-[0.12em] mt-0.5">
                  {roleLabel} Console
                </p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Divider */}
          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-5">
        {orderedGroups.map((group) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/35">
              {groupLabels[group] || group}
            </p>
            <div className="space-y-0.5">
              {links.filter((l) => l.group === group).map((link) => {
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
                      isActive
                        ? "bg-gradient-to-r from-[rgba(99,130,245,0.25)] to-[rgba(99,130,245,0.08)] text-white shadow-sm border border-[rgba(99,130,245,0.25)]"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5/6 rounded-r bg-sidebar-primary nav-glow" />
                    )}
                    <link.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                      )}
                    />
                    <span className="flex-1 truncate">{link.label}</span>
                    {isActive && (
                      <ChevronRight className="h-3 w-3 text-sidebar-primary/70 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-2.5 px-1">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
          <p className="text-[10px] text-sidebar-foreground/40">System operational</p>
        </div>
        <p className="text-[10px] text-sidebar-foreground/25 text-center mt-2">Powered by SCCG © 2026</p>
      </div>
    </aside>
    </>
  );
}
