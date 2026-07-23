"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Download,
  FolderOpen,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/cv-suite", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/cv-suite/candidates", label: "Candidates", icon: Users, exact: false },
  { href: "/admin/cv-suite/builder", label: "CV Builder", icon: FileText, exact: true },
  { href: "/admin/cv-suite/templates", label: "Templates", icon: FolderOpen, exact: true },
  { href: "/admin/cv-suite/export", label: "Export Center", icon: Download, exact: true },
  { href: "/admin/cv-suite/documents", label: "Documents", icon: FolderOpen, exact: true },
];

export function CvSuiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 bg-card border rounded-xl p-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
