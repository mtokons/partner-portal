import { auth } from "@/auth";
import { getPartners } from "@/lib/db/repositories/partners";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { PlusIcon, ShieldIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Manage Partners" };

export default async function PartnersPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  // Protect route
  if (!user?.roles?.includes("admin") && user?.role !== "admin") {
    redirect("/dashboard");
  }

  const partners = await getPartners();

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Manage Partners</h1>
          <p className="page-subtitle">
            View and manage partner agencies in the platform.
          </p>
        </div>
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PlusIcon size={16} /> Add Partner
        </button>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-default)" }}>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Company</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Contact</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Onboarding</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Role</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  No partners found.
                </td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id} style={{ borderBottom: "1px solid var(--border-default)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500 }}>
                    {partner.company}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                    <div style={{ color: "var(--text-default)" }}>{partner.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{partner.email}</div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "1rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: partner.status === "active" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: partner.status === "active" ? "var(--accent-emerald)" : "var(--accent-amber)",
                      }}
                    >
                      {partner.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {partner.onboardingStatus}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {partner.role === "admin" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--accent-purple)", fontWeight: 600 }}>
                        <ShieldCheckIcon size={14} /> Admin
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Partner</span>
                    )}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <Link href={`/admin/partners/${partner.id}`} className="text-button" style={{ fontSize: "0.8125rem", color: "var(--accent-cyan)", textDecoration: "none" }}>
                      Edit
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
