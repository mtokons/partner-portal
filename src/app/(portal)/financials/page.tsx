import { auth } from "@/auth";
import { getInvoices } from "@/lib/db/repositories/financials";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { FileTextIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Financials" };

export default async function FinancialsPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.roles?.includes("admin") || user.role === "admin";
  const partnerId = isAdmin ? undefined : user.partnerId;

  const invoices = await getInvoices(partnerId);

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Financials</h1>
          <p className="page-subtitle">
            {isAdmin ? "Overview of all invoices and transactions." : "Track your agency's invoices, commissions, and payouts."}
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-default)" }}>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Invoice No</th>
              {isAdmin && <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Partner/Client</th>}
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Amount</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Due Date</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <FileTextIcon size={32} style={{ color: "var(--border-strong)" }} />
                    <p>No financial records found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} style={{ borderBottom: "1px solid var(--border-default)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-default)" }}>
                    {invoice.orderNumber || invoice.id.substring(0, 8).toUpperCase()}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      {invoice.partnerId || invoice.clientId}
                    </td>
                  )}
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500 }}>
                    ৳{(invoice.amount || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "1rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: invoice.status === "paid" ? "rgba(16, 185, 129, 0.15)" : invoice.status === "overdue" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: invoice.status === "paid" ? "var(--accent-emerald)" : invoice.status === "overdue" ? "var(--accent-red)" : "var(--accent-amber)",
                      }}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", display: "flex", gap: "0.75rem" }}>
                    <Link href={`/financials/invoice/${invoice.id}`} className="text-button" style={{ fontSize: "0.8125rem", color: "var(--accent-cyan)", textDecoration: "none" }}>
                      View
                    </Link>
                    <button className="text-button" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer" }}>
                      <DownloadIcon size={14} /> PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
