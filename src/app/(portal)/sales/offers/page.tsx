import { auth } from "@/auth";
import { getSalesOffers } from "@/lib/db/repositories/sales";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { PlusIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Sales Offers" };

export default async function SalesOffersPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.roles?.includes("admin") || user.role === "admin";
  const partnerId = isAdmin ? undefined : user.partnerId;

  const offers = await getSalesOffers(partnerId);

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Sales Offers</h1>
          <p className="page-subtitle">
            {isAdmin ? "View all sales offers across the platform." : "Manage your agency's sales offers."}
          </p>
        </div>
        <Link href="/sales/offers/new" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <PlusIcon size={16} /> Create Offer
        </Link>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-default)" }}>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Offer Number</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Client</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Total Value</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Date</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <FileTextIcon size={32} style={{ color: "var(--border-strong)" }} />
                    <p>No sales offers found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              offers.map((offer) => (
                <tr key={offer.id} style={{ borderBottom: "1px solid var(--border-default)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-default)" }}>
                    {offer.offerNumber || <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-default)" }}>
                    {offer.clientId}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500 }}>
                    ৳{(offer.totalAmount || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "1rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: offer.status === "accepted" ? "rgba(16, 185, 129, 0.15)" : offer.status === "draft" ? "rgba(148, 163, 184, 0.15)" : offer.status === "sent" ? "rgba(56, 189, 248, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: offer.status === "accepted" ? "var(--accent-emerald)" : offer.status === "draft" ? "var(--text-muted)" : offer.status === "sent" ? "var(--accent-cyan)" : "var(--accent-red)",
                      }}
                    >
                      {offer.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {new Date(offer.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <Link href={`/sales/offers/${offer.id}`} className="text-button" style={{ fontSize: "0.8125rem", color: "var(--accent-cyan)", textDecoration: "none" }}>
                      View
                    </Link>
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
