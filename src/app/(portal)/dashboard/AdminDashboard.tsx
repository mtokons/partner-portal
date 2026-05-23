import type { SessionUser } from "@/types";
import { financials } from "@/lib/db";
import {
  DollarSignIcon,
  UsersIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  FileTextIcon,
  SettingsIcon,
  ShieldIcon
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard({ user }: { user: SessionUser }) {
  // Admin fetches global KPIs (no partnerId)
  const kpis = await financials.getDashboardKPIs();

  const cards = [
    { label: "Total Sales", value: kpis.totalSales, icon: <ShoppingCartIcon size={20} />, color: "var(--accent-cyan)" },
    { label: "Active Clients", value: kpis.activeClients, icon: <UsersIcon size={20} />, color: "var(--accent-emerald)" },
    { label: "Total Revenue", value: `৳${kpis.totalRevenue.toLocaleString()}`, icon: <TrendingUpIcon size={20} />, color: "var(--accent-purple)" },
    { label: "Pending Orders", value: kpis.pendingOrders, icon: <DollarSignIcon size={20} />, color: "var(--accent-amber)" },
    { label: "Overdue Installments", value: kpis.overdueInstallments, icon: <AlertCircleIcon size={20} />, color: "var(--accent-red)" },
    { label: "Unpaid Invoices", value: kpis.unpaidInvoices, icon: <FileTextIcon size={20} />, color: "var(--accent-coral)" },
  ];

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name || "Admin"}. Here's the platform overview.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/admin/partners" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldIcon size={16} /> Manage Partners
          </Link>
          <Link href="/admin/settings" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <SettingsIcon size={16} /> Settings
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {cards.map((card) => (
          <div key={card.label} className="kpi-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                {card.label}
              </span>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-md)",
                  background: `${card.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: card.color,
                }}
              >
                {card.icon}
              </div>
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          📊 Global system health and platform-wide charts will appear here.
        </p>
      </div>
    </div>
  );
}
