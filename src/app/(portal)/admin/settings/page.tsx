import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { redirect } from "next/navigation";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;
  if (!user?.roles?.includes("admin")) redirect("/dashboard");

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration and preferences</p>
      </div>

      <div className="glass-card" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>System Info</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {[
            { label: "Portal Version", value: "2.0.0" },
            { label: "Data Layer", value: "Firebase Firestore" },
            { label: "Auth Provider", value: "Firebase Authentication" },
            { label: "Framework", value: "Next.js 16 (App Router)" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{item.label}</span>
              <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
