import type { SessionUser } from "@/types";
import { financials } from "@/lib/db";
import {
  DollarSignIcon,
  UsersIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  FileTextIcon,
  PlusIcon
} from "lucide-react";
import Link from "next/link";

export default async function PartnerDashboard({ user }: { user: SessionUser }) {
  // Partner fetches KPIs isolated to their partnerId
  const kpis = await financials.getDashboardKPIs(user.partnerId);

  const cards = [
    { label: "My Sales", value: kpis.totalSales, icon: <ShoppingCartIcon size={20} />, color: "var(--accent-cyan)" },
    { label: "My Clients", value: kpis.activeClients, icon: <UsersIcon size={20} />, color: "var(--accent-emerald)" },
    { label: "My Revenue", value: `৳${kpis.totalRevenue.toLocaleString()}`, icon: <TrendingUpIcon size={20} />, color: "var(--accent-purple)" },
    { label: "Pending Orders", value: kpis.pendingOrders, icon: <DollarSignIcon size={20} />, color: "var(--accent-amber)" },
    { label: "Overdue Installments", value: kpis.overdueInstallments, icon: <AlertCircleIcon size={20} />, color: "var(--accent-red)" },
    { label: "Unpaid Invoices", value: kpis.unpaidInvoices, icon: <FileTextIcon size={20} />, color: "var(--accent-coral)" },
  ];

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Partner Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name || "Partner"}. Here is your agency overview.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/clients/new" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UsersIcon size={16} /> New Client
          </Link>
          <Link href="/sales/offers/new" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlusIcon size={16} /> New Offer
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
          📊 Partner-specific revenue charts and activity feed will appear here as data accumulates.
        </p>
      </div>
    </div>
  );
}
