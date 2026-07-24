"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Activity,
  DollarSign, Shield, BarChart3, FileText, Receipt, Handshake,
  UserCheck, Calendar, CalendarCheck, CreditCard, ChevronRight, ChevronDown,
  ClipboardList, Store, Tag, Share2, Wallet, User, X, ClipboardCheck,
  Building2, UserPlus, GraduationCap, BookOpen, Layers, Award, ShoppingBag, Search, Megaphone, Database,
  LifeBuoy, Settings, Bell, Sparkles, TrendingUp, AlertCircle, RotateCcw, Gift, Mail, ScrollText,
  FolderKanban, Table2, Briefcase, FolderCog, SlidersHorizontal, UsersRound, FileSearch, FilePen, FileArchive, Wand2, ShieldAlert, Send, FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem, ConsoleType } from "@/lib/menu-engine";
import { groupMenuItems, CONSOLE_META } from "@/lib/menu-engine";
import type { LucideIcon } from "lucide-react";

// Map icon name strings to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Package, ShoppingCart, Users, Activity,
  DollarSign, Shield, BarChart3, FileText, Receipt, Handshake,
  UserCheck, Calendar, CalendarCheck, CreditCard, ChevronRight, ChevronDown,
  ClipboardList, Store, Tag, Share2, Wallet, User, ClipboardCheck,
  Building2, UserPlus, GraduationCap, BookOpen, Layers, Award, ShoppingBag, Search, Megaphone, Database,
  LifeBuoy, Settings, Bell, Sparkles, TrendingUp, AlertCircle, RotateCcw, Gift, Mail, ScrollText,
  FolderKanban, Table2, Briefcase, FolderCog, SlidersHorizontal, UsersRound, FileSearch, FilePen, FileArchive, Wand2, ShieldAlert, Send, FileEdit,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || LayoutDashboard;
}

interface DynamicSidebarProps {
  console: ConsoleType;
  menuItems: MenuItem[];
  open: boolean;
  onClose: () => void;
  tierStatus?: string;
  marginPercentage?: number;
  partnerLogoUrl?: string;
}

const getTierBadge = (tier: string) => {
  switch (tier.toLowerCase()) {
    case "platinum": return { emoji: "👑", color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300" };
    case "diamond":  return { emoji: "💎", color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-300" };
    case "gold":     return { emoji: "✨", color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300" };
    default:         return { emoji: "🛡️", color: "from-slate-400/20 to-slate-500/20 border-slate-400/30 text-slate-300" };
  }
};

export default function DynamicSidebar({
  console: consoleName,
  menuItems,
  open,
  onClose,
  tierStatus,
  marginPercentage,
  partnerLogoUrl,
}: DynamicSidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isMini, setIsMini] = useState(false);

  const meta = CONSOLE_META[consoleName];
  const tier = tierStatus ? getTierBadge(tierStatus) : null;

  // Filter items by search
  const filteredItems = searchQuery.trim()
    ? menuItems.filter((item) => item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : menuItems;

  const groups = groupMenuItems(filteredItems);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen sidebar-mesh text-sidebar-foreground flex flex-col shadow-2xl transition-all duration-300 ease-in-out",
          "lg:translate-x-0 lg:z-40",
          open ? "translate-x-0" : "-translate-x-full",
          isMini ? "w-20" : "w-64"
        )}
      >
        {/* Decorative border */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(99,130,245,0.3)] to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className={cn("p-6 pb-4 shrink-0 transition-all", isMini && "p-4")}>
          <div className="flex items-center justify-between">
            {isMini ? (
              <img src={partnerLogoUrl || "/assets/sccg-logo.png"} alt="Logo" className="h-8 w-auto mx-auto object-contain animate-in fade-in zoom-in-90 duration-300" />
            ) : (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <img src={partnerLogoUrl || "/assets/sccg-logo.png"} alt="SCCG Logo" className="h-9 w-auto object-contain" />
                <div className="border-l border-white/10 pl-3">
                  <h1 className="text-[14px] font-bold text-white tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                    {meta.label}
                  </h1>
                  <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-[0.12em] mt-1">
                    {meta.subtitle}
                  </p>
                </div>
              </div>
            )}

            {/* Collapse Toggle (Desktop) */}
            <button
              onClick={() => setIsMini(!isMini)}
              className={cn(
                "hidden lg:flex h-8 w-8 rounded-xl bg-white/5 items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-sm",
                isMini && "mx-auto"
              )}
            >
              {isMini ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 -rotate-90" />}
            </button>

            {/* Mobile close */}
            <button
              onClick={onClose}
              className="lg:hidden h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tier Badge (Partner only) */}
          {consoleName === "partner" && tier && !isMini && (
            <div className={cn(
              "mt-3 px-3 py-2 rounded-xl border bg-gradient-to-r text-xs font-bold tracking-wide text-center animate-in fade-in slide-in-from-top-2 duration-300",
              tier.color
            )}>
              {tier.emoji} Proud SCCG {tierStatus} Partner
            </div>
          )}

          {/* Search Bar */}
          <div className={cn("mt-4 relative z-10 transition-all", isMini && "mt-6")}>
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
          {!isMini && (
            <div className="mt-3 flex justify-between items-center px-1 animate-in fade-in duration-300">
              <button 
                onClick={() => {
                  const collapsed: Record<string, boolean> = {};
                  groups.forEach(g => { collapsed[g.group] = false; });
                  setCollapsedGroups(collapsed);
                }}
                className="text-[10px] text-sidebar-foreground/40 hover:text-white transition-colors cursor-pointer font-medium"
              >
                Alle erweitern
              </button>
              <button 
                onClick={() => {
                  const collapsed: Record<string, boolean> = {};
                  groups.forEach(g => { collapsed[g.group] = true; });
                  setCollapsedGroups(collapsed);
                }}
                className="text-[10px] text-sidebar-foreground/40 hover:text-white transition-colors cursor-pointer font-medium"
              >
                Alle einklappen
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 px-3 pb-4 overflow-y-auto space-y-4 pr-1 scrollbar-hide transition-all", isMini && "px-2")}>
          {groups.length === 0 && !isMini && (
            <div className="text-center py-6 text-sidebar-foreground/40 text-sm">
              No results found for &quot;{searchQuery}&quot;
            </div>
          )}

          {groups.map(({ group, label, items }) => {
            const isCollapsed = !searchQuery.trim() && !isMini && collapsedGroups[group] !== false;

            return (
              <div key={group} className="flex flex-col">
                {!isMini && (
                  <button
                    onClick={() => {
                      setCollapsedGroups(prev => ({
                        ...prev,
                        [group]: prev[group] === false ? true : false
                      }));
                    }}
                    className="flex items-center justify-between w-full px-3 mb-1.5 focus:outline-none group/btn transition-all cursor-pointer"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40 group-hover/btn:text-sidebar-foreground/70 transition-colors">
                      {label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 text-sidebar-foreground/30 group-hover/btn:text-sidebar-foreground/50 transition-transform duration-200",
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      )}
                    />
                  </button>
                )}

                <div
                  className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
                  )}
                >
                  {items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                    const Icon = getIcon(item.icon);

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={onClose}
                        title={isMini ? item.label : ""}
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
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                          )}
                        />
                        {!isMini && <span className="flex-1 truncate">{item.label}</span>}
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
          <div className={cn("flex items-center gap-2.5 px-1", isMini && "justify-center")}>
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
            {!isMini && <p className="text-[10px] text-sidebar-foreground/40">System operational</p>}
          </div>
          {!isMini && (
            <div className="text-[9px] text-sidebar-foreground/25 text-center mt-3 space-y-0.5">
              <p className="font-bold text-sidebar-foreground/40 uppercase tracking-tight leading-none">SCCG Career Lab UG</p>
              <p>Julius-Ludowieg-Straße 46, 21073 Hamburg</p>
              <p>&copy; 2026 SCCG</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
