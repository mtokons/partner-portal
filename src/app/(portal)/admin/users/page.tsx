import { auth } from "@/auth";
import { getUsers } from "@/lib/db/repositories/users";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { UserPlusIcon, ShieldIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Manage Users" };

export default async function UsersPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  // Protect route
  if (!user?.roles?.includes("admin") && user?.role !== "admin") {
    redirect("/dashboard");
  }

  const usersList = await getUsers();

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">
            View and manage platform users and their roles.
          </p>
        </div>
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <UserPlusIcon size={16} /> Invite User
        </button>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-default)" }}>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>User</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Company</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Role</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              usersList.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border-default)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                    <div style={{ color: "var(--text-default)", fontWeight: 500 }}>{u.displayName || u.email.split("@")[0]}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {u.company ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text-default)" }}>
                        <BuildingIcon size={14} style={{ color: "var(--text-muted)" }} /> {u.company}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {u.role === "admin" || u.roles?.includes("admin") ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--accent-purple)", fontWeight: 600 }}>
                        <ShieldIcon size={14} /> Admin
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textTransform: "capitalize" }}>{u.role || "partner"}</span>
                    )}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "1rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: u.status === "active" ? "rgba(16, 185, 129, 0.15)" : u.status === "pending" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: u.status === "active" ? "var(--accent-emerald)" : u.status === "pending" ? "var(--accent-amber)" : "var(--accent-red)",
                      }}
                    >
                      {u.status || "active"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <Link href={`/admin/users/${u.id}`} className="text-button" style={{ fontSize: "0.8125rem", color: "var(--accent-cyan)", textDecoration: "none" }}>
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
