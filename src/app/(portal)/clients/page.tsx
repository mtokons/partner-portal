import { auth } from "@/auth";
import { getClients } from "@/lib/db/repositories/clients";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { UserPlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.roles?.includes("admin") || user.role === "admin";
  const partnerId = isAdmin ? undefined : user.partnerId;

  const clients = await getClients(partnerId);

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            {isAdmin ? "View all clients across the platform." : "Manage your agency's clients."}
          </p>
        </div>
        <Link href="/clients/new" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <UserPlusIcon size={16} /> Add Client
        </Link>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-default)" }}>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Name</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Contact</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Company</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Joined</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <UsersIcon size={32} style={{ color: "var(--border-strong)" }} />
                    <p>No clients found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} style={{ borderBottom: "1px solid var(--border-default)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-default)" }}>
                    {client.name}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                    <div style={{ color: "var(--text-default)" }}>{client.email}</div>
                    {client.phone && <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{client.phone}</div>}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-default)" }}>
                    {client.company || <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <Link href={`/clients/${client.id}`} className="text-button" style={{ fontSize: "0.8125rem", color: "var(--accent-cyan)", textDecoration: "none" }}>
                      View Profile
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
