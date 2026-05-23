import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import Sidebar from "@/components/layout/Sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;
  const roles = user.roles || [user.role];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        userName={user.name || "User"}
        company={user.company}
        roles={roles}
      />
      <main className="page-content">
        {children}
      </main>
    </div>
  );
}
