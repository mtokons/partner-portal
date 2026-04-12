"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, CreditCard, Bell, GraduationCap, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/expert/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expert/clients", label: "My Clients", icon: Users },
  { href: "/expert/sessions", label: "Sessions", icon: Calendar },
  { href: "/expert/teaching", label: "My Teaching", icon: BookOpen },
  { href: "/expert/payments", label: "My Earnings", icon: CreditCard },
  { href: "/expert/notifications", label: "Notifications", icon: Bell },
];

export default function ExpertSidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-purple flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Expert Portal</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Service Delivery</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <link.icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
              {link.label}
              {link.href === "/expert/notifications" && unreadCount > 0 && (
                <span className="ml-auto bg-purple-500 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-bold">
                  {unreadCount}
                </span>
              )}
              {isActive && !link.href.includes("notifications") && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/40 text-center">Powered by SCCG © 2026</p>
      </div>
    </aside>
  );
}
