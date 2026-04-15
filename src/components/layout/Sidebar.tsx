"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Activity,
  DollarSign, Shield, BarChart3, FileText, Receipt, Handshake,
  UserCheck, Calendar, CreditCard, Zap, Mail, ChevronRight, ChevronDown,
  FlaskConical, ClipboardList, Store, Tag, Share2, Wallet, User, X, ClipboardCheck,
  Building2, UserPlus, GraduationCap, BookOpen, Layers, Award, ShoppingBag, Search, Megaphone
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "main", roles: ["partner", "admin", "finance", "hr", "school-manager"] },
  { href: "/customer/dashboard", label: "My Dashboard", icon: LayoutDashboard, group: "main", roles: ["customer"] },
  { href: "/expert/dashboard", label: "Expert Console", icon: LayoutDashboard, group: "main", roles: ["expert"] },
  { href: "/orders", label: "Orders", icon: ShoppingCart, group: "main", roles: ["partner"] },
  { href: "/clients", label: "Clients", icon: Users, group: "main", roles: ["partner"] },
  { href: "/marketplace", label: "SCCG Marketplace", icon: ShoppingBag, group: "main", roles: ["partner", "admin", "customer", "expert"] },
  { href: "/activity", label: "Activity", icon: Activity, group: "main", roles: ["partner", "admin"] },
  
  // Offer Builder
  { href: "/shop", label: "Offer Builder", icon: Store, group: "offer", roles: ["partner", "admin"] },
  { href: "/sales/offers", label: "Quotations", icon: Handshake, group: "offer", roles: ["partner", "admin"] },
  { href: "/sales/orders", label: "Sales Orders", icon: ClipboardList, group: "offer", roles: ["partner", "admin"] },
  { href: "/admin/products", label: "Manage Products", icon: Package, group: "offer", roles: ["admin"] },
  
  // Finance
  { href: "/financials", label: "P&L Overview", icon: DollarSign, group: "finance", roles: ["partner", "finance"] },
  { href: "/financials/expenses", label: "Expenses", icon: Receipt, group: "finance", roles: ["partner", "finance"] },
  { href: "/financials/invoices", label: "Invoices", icon: FileText, group: "finance", roles: ["partner", "finance"] },
  { href: "/financials/payouts", label: "My Payouts", icon: Wallet, group: "finance", roles: ["partner"] },
  { href: "/admin/financials", label: "Global Financials", icon: DollarSign, group: "finance", roles: ["admin", "finance"] },
  { href: "/admin/expert-payments", label: "Expert Payments", icon: CreditCard, group: "finance", roles: ["admin", "finance"] },
  { href: "/admin/payouts", label: "Admin Payouts", icon: Wallet, group: "finance", roles: ["admin", "finance"] },
  { href: "/admin/payments", label: "Admin Payments", icon: DollarSign, group: "finance", roles: ["admin", "finance"] },
  { href: "/admin/invoices", label: "Admin Invoices", icon: FileText, group: "finance", roles: ["admin", "finance"] },
  { href: "/admin/reports", label: "Financial Reports", icon: BarChart3, group: "finance", roles: ["admin", "finance"] },
  
  // Wallet
  { href: "/wallets", label: "SCCG Wallet", icon: Wallet, group: "wallet", roles: ["partner", "admin", "expert", "customer"] },
  { href: "/admin/wallets", label: "Manage Wallets", icon: Wallet, group: "wallet", roles: ["admin"] },
  { href: "/admin/sccg-cards", label: "SCCG Cards", icon: CreditCard, group: "wallet", roles: ["admin", "finance"] },
  
  // Marketing
  { href: "/referrals", label: "My Referral Code", icon: Share2, group: "marketing", roles: ["partner"] },
  { href: "/commissions", label: "My Commissions", icon: DollarSign, group: "marketing", roles: ["partner"] },
  { href: "/admin/referrals", label: "Platform Referrals", icon: Share2, group: "marketing", roles: ["admin"] },
  { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag, group: "marketing", roles: ["admin"] },
  { href: "/admin/promotions", label: "Promotions", icon: Megaphone, group: "marketing", roles: ["admin"] },
  { href: "/admin/commission-rules", label: "Commission Rules", icon: DollarSign, group: "marketing", roles: ["admin"] },
  { href: "/admin/commissions", label: "Commission Ledger", icon: FileText, group: "marketing", roles: ["admin", "finance"] },
  
  // HR
  { href: "/admin/hr", label: "HR Dashboard", icon: Building2, group: "hr", roles: ["admin", "hr"] },
  { href: "/admin/hr/employees", label: "Employees", icon: Users, group: "hr", roles: ["admin", "hr"] },
  { href: "/admin/hr/employees/new", label: "Add Employee", icon: UserPlus, group: "hr", roles: ["admin", "hr"] },
  { href: "/admin/hr/reports", label: "HR Reports", icon: BarChart3, group: "hr", roles: ["admin", "hr"] },
  
  // Language School
  { href: "/admin/school", label: "School Dashboard", icon: GraduationCap, group: "school", roles: ["admin", "school-manager"] },
  { href: "/admin/school/courses", label: "Courses", icon: BookOpen, group: "school", roles: ["admin", "school-manager"] },
  { href: "/admin/school/batches", label: "Batches", icon: Layers, group: "school", roles: ["admin", "school-manager"] },
  { href: "/admin/school/enrollments", label: "Enrollments", icon: ClipboardList, group: "school", roles: ["admin", "school-manager"] },
  { href: "/admin/school/teachers", label: "Teachers", icon: UserCheck, group: "school", roles: ["admin", "school-manager"] },
  { href: "/admin/school/certificates", label: "Certificates", icon: Award, group: "school", roles: ["admin", "school-manager"] },
  { href: "/admin/school/reports", label: "School Reports", icon: BarChart3, group: "school", roles: ["admin", "school-manager"] },
  
  // Admin
  { href: "/admin/overview", label: "Admin Overview", icon: BarChart3, group: "admin", roles: ["admin"] },
  { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck, group: "admin", roles: ["admin"] },
  { href: "/admin/users", label: "Manage Users", icon: Users, group: "admin", roles: ["admin"] },
  { href: "/admin/partners", label: "Manage Partners", icon: Shield, group: "admin", roles: ["admin"] },
  { href: "/admin/customers", label: "Customers", icon: Users, group: "admin", roles: ["admin"] },
  { href: "/admin/experts", label: "Experts", icon: UserCheck, group: "admin", roles: ["admin"] },
  { href: "/admin/sessions", label: "All Sessions", icon: Calendar, group: "admin", roles: ["admin"] },
  { href: "/admin/orders", label: "All Orders", icon: ShoppingCart, group: "admin", roles: ["admin"] },
  { href: "/admin/send-email", label: "Send Email", icon: Mail, group: "admin", roles: ["admin"] },
  { href: "/admin/tasks", label: "Planning Board", icon: ClipboardList, group: "admin", roles: ["admin"] },
  
  // Account
  { href: "/profile", label: "My Profile", icon: User, group: "account", roles: ["partner", "admin", "finance", "hr", "school-manager", "customer", "expert"] },
  
  // Dev
  { href: "/sp-test", label: "SP CRUD Test", icon: FlaskConical, group: "dev", roles: ["admin"] },
];

const groupLabels: Record<string, string> = {
  main: "Main",
  offer: "Offer Builder",
  finance: "Finance",
  wallet: "Wallet & Rewards",
  marketing: "Marketing & Promos",
  hr: "Human Resources",
  school: "Language School",
  admin: "Administration",
  account: "Account",
  dev: "Developer",
};

export default function Sidebar({ roles, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Filter based on roles and search
  const seen = new Set<string>();
  const filteredLinks = allLinks.filter((l) => {
    if (!l.roles.some((r) => roles.includes(r))) return false;
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    
    // Apply search logic
    if (searchQuery.trim()) {
      return l.label.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  const isAdmin = roles.includes("admin");
  const roleLabel = isAdmin ? "Admin" : roles.includes("partner") ? "Partner" : roles.includes("expert") ? "Expert" : roles.includes("customer") ? "Customer" : "User";

  // Compute active groups based on filtered links
  const seenGroups = new Set<string>();
  const orderedGroups: string[] = [];
  filteredLinks.forEach((l) => {
    if (!seenGroups.has(l.group)) { 
      seenGroups.add(l.group); 
      orderedGroups.push(l.group); 
    }
  });

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

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
        <div className="p-6 pb-4 shrink-0">
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
          
          {/* Search Bar */}
          <div className="mt-5 relative z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-sidebar-border/30 rounded-xl pl-9 pr-3 py-2 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/30 outline-none focus:bg-white/10 focus:border-sidebar-primary/50 transition-all font-medium"
            />
          </div>
          
          {/* Divider */}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
          {orderedGroups.length === 0 && (
            <div className="text-center py-6 text-sidebar-foreground/40 text-sm">
              No results found for "{searchQuery}"
            </div>
          )}
        
          {orderedGroups.map((group) => {
            const groupLinks = filteredLinks.filter((l) => l.group === group);
            // If searching, force expand group
            const isCollapsed = !searchQuery.trim() && collapsedGroups[group];
            
            return (
              <div key={group} className="flex flex-col">
                <button 
                  onClick={() => toggleGroup(group)}
                  className="flex items-center justify-between w-full px-3 mb-1.5 focus:outline-none group/btn transition-all"
                >
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40 group-hover/btn:text-sidebar-foreground/70 transition-colors">
                    {groupLabels[group] || group}
                  </span>
                  <ChevronDown className={cn(
                    "h-3 w-3 text-sidebar-foreground/30 group-hover/btn:text-sidebar-foreground/50 transition-transform duration-200",
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  )} />
                </button>
                
                <div className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
                  isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
                )}>
                  {groupLinks.map((link) => {
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
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border/50 shrink-0">
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
