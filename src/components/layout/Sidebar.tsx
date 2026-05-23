"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  UsersIcon,
  PackageIcon,
  FileTextIcon,
  ShoppingCartIcon,
  BarChart3Icon,
  SettingsIcon,
  ShieldIcon,
  LogOutIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboardIcon size={18} /> },
  { label: "Clients", href: "/clients", icon: <UsersIcon size={18} /> },
  { label: "Products", href: "/products", icon: <PackageIcon size={18} /> },
];

const salesNav: NavItem[] = [
  { label: "Sales Offers", href: "/sales/offers", icon: <FileTextIcon size={18} /> },
  { label: "Sales Orders", href: "/sales/orders", icon: <ShoppingCartIcon size={18} /> },
];

const financeNav: NavItem[] = [
  { label: "Financials", href: "/financials", icon: <BarChart3Icon size={18} /> },
];

const adminNav: NavItem[] = [
  { label: "Partners", href: "/admin/partners", icon: <ShieldIcon size={18} />, roles: ["admin"] },
  { label: "Users", href: "/admin/users", icon: <UsersIcon size={18} />, roles: ["admin"] },
  { label: "Settings", href: "/admin/settings", icon: <SettingsIcon size={18} />, roles: ["admin"] },
];

interface SidebarProps {
  userName: string;
  company?: string;
  roles: string[];
}

export default function Sidebar({ userName, company, roles }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = roles.includes("admin");

  function renderLink(item: NavItem) {
    if (item.roles && !item.roles.some((r) => roles.includes(r))) return null;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`sidebar-link ${isActive ? "active" : ""}`}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div
        style={{
          padding: "1.25rem 1.25rem 1rem",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              fontWeight: 800,
              color: "white",
              flexShrink: 0,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 600 }}>SCCG Portal</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>v2.0</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "0.5rem 0", overflowY: "auto" }}>
        <div className="sidebar-section">Main</div>
        {mainNav.map(renderLink)}

        <div className="sidebar-section">Sales</div>
        {salesNav.map(renderLink)}

        <div className="sidebar-section">Finance</div>
        {financeNav.map(renderLink)}

        {isAdmin && (
          <>
            <div className="sidebar-section">Administration</div>
            {adminNav.map(renderLink)}
          </>
        )}
      </nav>

      {/* User Footer */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderTop: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--bg-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--accent-cyan)",
            flexShrink: 0,
          }}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {userName}
          </div>
          {company && (
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {company}
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-ghost"
          style={{ padding: "0.375rem", borderRadius: "var(--radius-md)", cursor: "pointer", background: "none", border: "none" }}
          title="Sign out"
        >
          <LogOutIcon size={16} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
    </aside>
  );
}
