"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, LogOut, Search, ChevronDown, Settings, Menu, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/lib/actions";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userName: string;
  company: string;
  overdueCount: number;
  unpaidInvoicesCount: number;
  onMenuToggle?: () => void;
}

export default function Header({ userName, company, overdueCount, unpaidInvoicesCount, onMenuToggle = () => {} }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const totalAlerts = overdueCount + unpaidInvoicesCount;
  const initials = userName.slice(0, 2).toUpperCase();
  const firstName = userName.split(" ")[0];
  const [searchFocused, setSearchFocused] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Build breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 z-30 h-14 lg:h-16 header-glass flex items-center justify-between px-3 sm:px-6">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Hamburger (mobile only) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb (mobile: only last segment) */}
        <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
          <Link href="/dashboard" className="text-muted-foreground/60 hover:text-foreground transition-colors hidden sm:block shrink-0">
            Home
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className={cn("flex items-center gap-1 min-w-0", i < breadcrumbs.length - 1 && "hidden sm:flex")}>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-foreground truncate">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="text-muted-foreground/60 hover:text-foreground transition-colors truncate">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Search bar (hidden on small mobile) */}
        <div className="relative hidden md:block">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-200",
              searchFocused ? "text-primary" : "text-muted-foreground/50"
            )}
          />
          <input
            type="text"
            placeholder="Quick search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "pl-8 pr-3 py-1.5 text-sm rounded-xl border bg-muted/40 outline-none transition-all duration-200",
              "placeholder:text-muted-foreground/40 text-foreground",
              searchFocused
                ? "w-56 lg:w-72 border-primary/40 bg-white ring-2 ring-primary/10 shadow-md"
                : "w-40 lg:w-52 border-border hover:border-primary/20 hover:bg-muted/60"
            )}
          />
        </div>
      </div>

      {/* Right: alerts + user */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        {/* Alert bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "relative h-9 w-9 rounded-xl p-0 transition-all",
              totalAlerts > 0
                ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                : "text-muted-foreground/60 hover:text-foreground"
            )}
            onClick={() => setAlertOpen(!alertOpen)}
          >
            <Bell className="h-4.5 w-4.5" />
            {totalAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-bold pulse-ring shadow-sm">
                {totalAlerts}
              </span>
            )}
          </Button>

          {/* Alert dropdown */}
          {alertOpen && totalAlerts > 0 && (
            <div className="absolute right-0 top-11 w-72 rounded-2xl bg-white/90 backdrop-blur-xl border border-border/60 shadow-2xl p-3 z-50 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-semibold text-foreground px-1 mb-2">Notifications</p>
              <div className="space-y-1.5">
                {overdueCount > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{overdueCount} overdue installment{overdueCount > 1 ? "s" : ""}</p>
                  </div>
                )}
                {unpaidInvoicesCount > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                    <p className="text-sm text-orange-700 font-medium">{unpaidInvoicesCount} unpaid invoice{unpaidInvoicesCount > 1 ? "s" : ""}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-xl p-0 text-muted-foreground/60 hover:text-foreground hidden md:flex"
          onClick={() => router.push("/profile")}
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="h-8 w-px bg-border mx-0.5 sm:mx-1 hidden sm:block" />

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <Avatar className="h-8 w-8 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-foreground leading-none">{firstName}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{company}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground/40 hidden sm:block" />
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-48 rounded-2xl bg-white/95 backdrop-blur-xl border border-border/60 shadow-2xl p-1.5 z-50 animate-in slide-in-from-top-2 duration-200">
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/60 transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                My Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
