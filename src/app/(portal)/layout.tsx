import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices } from "@/lib/sharepoint";
import PortalShell from "@/components/layout/PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  // Allow partner, admin, finance, hr, school-manager, teacher, customer, expert roles
  const portalRoles = ["partner", "admin", "finance", "hr", "school-manager", "teacher", "customer", "expert"];
  if (!userRoles.some((r) => portalRoles.includes(r))) redirect("/login");

  const isAdmin = userRoles.includes("admin");
  const installments = await getInstallments(isAdmin ? undefined : user.partnerId);
  const invoices = await getInvoices(isAdmin ? undefined : user.partnerId);
  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return (
    <PortalShell
      roles={userRoles}
      userName={user.name || "User"}
      company={user.company}
      overdueCount={overdueCount}
      unpaidInvoicesCount={unpaidInvoicesCount}
    >
      {children}
    </PortalShell>
  );
}
