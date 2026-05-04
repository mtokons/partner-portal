"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Activity,
  DollarSign, Shield, BarChart3, FileText, Receipt, Handshake,
  UserCheck, Calendar, CreditCard, Zap, Mail, ChevronRight, ChevronDown,
  FlaskConical, ClipboardList, Store, Tag, Share2, Wallet, User, X, ClipboardCheck,
  Building2, UserPlus, GraduationCap, BookOpen, Layers, Award, ShoppingBag, Search, Megaphone, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { getConnectionInfoAction } from "@/app/actions/connection";
import { ExternalLink } from "lucide-react";

interface SidebarProps {
  roles: string[];
  open: boolean;
  onClose: () => void;
  siteUrl?: string;
  listUrls?: Record<string, string>;
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
  { href: "/admin/tasks", label: "Task Board", icon: ClipboardList, group: "main", roles: ["admin"] },
  { href: "/customer/dashboard", label: "My Dashboard", icon: LayoutDashboard, group: "main", roles: ["customer"] },
  { href: "/expert/dashboard", label: "Expert Console", icon: LayoutDashboard, group: "main", roles: ["expert"] },
  
  // Sales & CRM
  { href: "/marketplace", label: "SCCG Marketplace", icon: ShoppingBag, group: "sales", roles: ["partner", "admin", "customer", "expert"] },
  { href: "/shop", label: "Offer Builder", icon: Store, group: "sales", roles: ["partner", "admin"] },
  { href: "/sales/offers", label: "Quotations", icon: Handshake, group: "sales", roles: ["partner", "admin"] },
  { href: "/sales/orders", label: "Sales Orders", icon: ClipboardList, group: "sales", roles: ["partner", "admin"] },
  { href: "/orders", label: "Orders", icon: ShoppingCart, group: "sales", roles: ["partner"] },
  { href: "/clients", label: "Clients", icon: Users, group: "sales", roles: ["partner"] },
  { href: "/admin/products", label: "Manage Products", icon: Package, group: "sales", roles: ["admin"] },
  
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
  
  // Promotion & Marketing
  { href: "/referrals", label: "My Referral Code", icon: Share2, group: "marketing", roles: ["partner"] },
  { href: "/commissions", label: "My Commissions", icon: DollarSign, group: "marketing", roles: ["partner"] },
  { href: "/admin/referrals", label: "Platform Referrals", icon: Share2, group: "marketing", roles: ["admin"] },
  { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag, group: "marketing", roles: ["admin"] },
  { href: "/admin/promotions", label: "Promotions", icon: Megaphone, group: "marketing", roles: ["admin"] },
  { href: "/admin/commission-rules", label: "Commission Rules", icon: DollarSign, group: "marketing", roles: ["admin"] },
  { href: "/admin/commissions", label: "Commission Ledger", icon: FileText, group: "marketing", roles: ["admin", "finance"] },
  
  // Human Resources
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
  { href: "/admin/school/certificate-generator", label: "Certificate Tool", icon: Layers, group: "school", roles: ["admin", "school-manager"] },
  { href: "/admin/school/reports", label: "School Reports", icon: BarChart3, group: "school", roles: ["admin", "school-manager"] },
  
  // Administration
  { href: "/admin/overview", label: "Admin Overview", icon: BarChart3, group: "admin", roles: ["admin"] },
  { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck, group: "admin", roles: ["admin"] },
  { href: "/admin/users", label: "Manage Users", icon: Users, group: "admin", roles: ["admin"] },
  { href: "/admin/partners", label: "Manage Partners", icon: Shield, group: "admin", roles: ["admin"] },
  { href: "/admin/customers", label: "Customers", icon: Users, group: "admin", roles: ["admin"] },
  { href: "/admin/experts", label: "Experts", icon: UserCheck, group: "admin", roles: ["admin"] },
  { href: "/admin/sessions", label: "All Sessions", icon: Calendar, group: "admin", roles: ["admin"] },
  { href: "/admin/orders", label: "All Orders", icon: ShoppingCart, group: "admin", roles: ["admin"] },
  { href: "/admin/send-email", label: "Send Email", icon: Mail, group: "admin", roles: ["admin"] },
  { href: "/activity", label: "Activity Logs", icon: Activity, group: "admin", roles: ["admin"] },
  
  // Account
  { href: "/profile", label: "My Profile", icon: User, group: "account", roles: ["partner", "admin", "finance", "hr", "school-manager", "customer", "expert"] },
  
  { href: "/admin/send-email", label: "Send Email", icon: Mail, group: "admin", roles: ["admin"] },
  { href: "/activity", label: "Activity Logs", icon: Activity, group: "admin", roles: ["admin"] },
];

const groupLabels: Record<string, string> = {
  main: "Main Console",
  sales: "Sales & CRM",
  finance: "Finance Department",
  wallet: "Wallet & Rewards",
  marketing: "Promotion & Marketing",
  hr: "Human Resources",
  school: "Language School",
  admin: "Administration",
  account: "Account Setting",
};

export default function Sidebar({ 
  roles, 
  open, 
  onClose = () => {}, 
  siteUrl,
  listUrls = {}
}: SidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isMini, setIsMini] = useState(false);
  const userRole = roles[0] || "partner";

  // Context-aware list mapping
  const routeToList: Record<string, string> = {
    "/dashboard": "SalesOrders",
    "/sales/orders": "SalesOrders",
    "/sales/offers": "SalesOffers",
    "/shop": "SalesOffers",
    "/clients": "Clients",
    "/admin/products": "Products",
    "/marketplace": "Products",
    "/orders": "Orders",
    "/admin/orders": "SalesOrders",
    "/financials": "Financials",
    "/financials/expenses": "Expenses",
    "/financials/invoices": "Invoices",
    "/admin/tasks": "KanbanTasks",
    "/activity": "Activities",
    "/admin/partners": "Partners",
    "/admin/experts": "Experts",
    "/admin/invoices": "Invoices",
    "/admin/payouts": "Payouts",
    "/financials/payouts": "Payouts",
    "/referrals": "Referrals",
    "/admin/referrals": "Referrals",
    "/admin/promotions": "Promotions",
    "/admin/promo-codes": "PromoCodes",
    "/admin/commission-rules": "CommissionRules",
    "/admin/commissions": "CommissionLedger",
    "/admin/wallets": "CoinWallets",
    "/wallets": "CoinWallets",
    "/admin/sccg-cards": "GiftCards",
    "/admin/school/certificates": "SchoolCertificates",
    "/admin/users": "UserProfiles",
  };
  const currentListName = routeToList[pathname] || "SalesOrders";
  const sidebarLinkUrl = listUrls[currentListName] || siteUrl || "#";

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
          "fixed left-0 top-0 z-50 h-screen sidebar-mesh text-sidebar-foreground flex flex-col shadow-2xl transition-all duration-300 ease-in-out",
          "lg:translate-x-0 lg:z-40",
          open ? "translate-x-0" : "-translate-x-full",
          isMini ? "w-20" : "w-64"
        )}
      >
        {/* Decorative border right */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(99,130,245,0.3)] to-transparent pointer-events-none" />

        {/* Brand & Mini Toggle */}
        <div className={cn("p-6 pb-4 shrink-0 transition-all", isMini && "p-4")}>
          <div className="flex items-center justify-between">
            {isMini ? (
              <img src="/assets/sccg-logo.png" alt="Logo" className="h-8 w-auto mx-auto object-contain animate-in fade-in zoom-in-90 duration-300" />
            ) : (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <img src="/assets/sccg-logo.png" alt="SCCG Logo" className="h-9 w-auto object-contain" />
                <div className="border-l border-white/10 pl-3">
                  <h1 className="text-[14px] font-bold text-white tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                    Partner Portal
                  </h1>
                  <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-[0.12em] mt-1">
                    {roleLabel} Console
                  </p>
                </div>
              </div>
            )}
            
            {/* Collapse Toggle (Desktop only) */}
            <button
              onClick={() => setIsMini(!isMini)}
              className={cn(
                "hidden lg:flex h-8 w-8 rounded-xl bg-white/5 items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-sm",
                isMini && "mx-auto"
              )}
            >
              {isMini ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 -rotate-90" />}
            </button>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Search Bar (Hidden or Icon-only in Mini) */}
          <div className={cn("mt-5 relative z-10 transition-all", isMini && "mt-8")}>
            {isMini ? (
              <div 
                className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-white/5 text-sidebar-foreground/40 cursor-pointer hover:bg-white/10"
                onClick={() => setIsMini(false)}
              >
                <Search className="h-4 w-4" />
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-sidebar-border/30 rounded-xl pl-9 pr-3 py-2 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/30 outline-none focus:bg-white/10 focus:border-sidebar-primary/50 transition-all font-medium"
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 px-3 pb-4 overflow-y-auto space-y-4 pr-1 scrollbar-hide transition-all", isMini && "px-2")}>
          {orderedGroups.length === 0 && !isMini && (
            <div className="text-center py-6 text-sidebar-foreground/40 text-sm">
              No results found for "{searchQuery}"
            </div>
          )}
        
          {orderedGroups.map((group) => {
            const groupLinks = filteredLinks.filter((l) => l.group === group);
            const isCollapsed = !searchQuery.trim() && !isMini && collapsedGroups[group];
            
            return (
              <div key={group} className="flex flex-col">
                {!isMini && (
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
                )}
                
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
                        title={isMini ? link.label : ""}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
                          isMini ? "justify-center p-3 h-12 w-12 mx-auto" : "px-3 py-2.5",
                          isActive
                            ? "bg-gradient-to-r from-[rgba(99,130,245,0.25)] to-[rgba(99,130,245,0.08)] text-white shadow-sm border border-[rgba(99,130,245,0.25)]"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        )}
                      >
                        {isActive && !isMini && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5/6 rounded-r bg-sidebar-primary nav-glow" />
                        )}
                        <link.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                          )}
                        />
                        {!isMini && <span className="flex-1 truncate">{link.label}</span>}
                        {isActive && !isMini && (
                          <ChevronRight className="h-3 w-3 text-sidebar-primary/70 shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
                {isMini && <div className="h-px bg-white/5 mx-auto w-8 my-2" />}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("p-4 border-t border-sidebar-border/50 shrink-0 transition-all", isMini && "p-2")}>
          {siteUrl && !isMini && (
            <a 
              href={sidebarLinkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[11px] font-bold hover:bg-indigo-500/10 hover:border-indigo-500/20 hover:text-indigo-300 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative flex items-center justify-center h-6 w-6 rounded-lg bg-indigo-500/10 shrink-0">
                <Database className="h-3.5 w-3.5" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-[#09090b] animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate leading-tight">Live SharePoint</span>
                <span className="text-[9px] text-indigo-400/50 font-medium">Real-time Sync</span>
              </div>
              <ExternalLink className="h-3 w-3 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </a>
          )}
          
          <div className={cn("flex items-center gap-2.5 px-1", isMini && "justify-center")}>
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
            {!isMini && <p className="text-[10px] text-sidebar-foreground/40">System operational</p>}
          </div>
          {!isMini && (
            <div className="text-[9px] text-sidebar-foreground/25 text-center mt-3 space-y-0.5">
              <p className="font-bold text-sidebar-foreground/40 uppercase tracking-tight leading-none">SCCG Career Lab UG</p>
              <p>Julius-Ludowieg-Straße 46, 21073 Hamburg</p>
              <p>© 2026 SCCG</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
