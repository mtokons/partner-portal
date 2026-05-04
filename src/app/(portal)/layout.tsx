import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices } from "@/lib/sharepoint";
import PortalShell from "@/components/layout/PortalShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  // Allow partner, admin, finance, hr, school-manager, teacher, customer, expert roles
  const portalRoles = ["partner", "admin", "finance", "hr", "school-manager", "teacher", "customer", "expert"];
  if (!userRoles.some((r) => portalRoles.includes(r))) redirect("/login");

  const isAdmin = userRoles.includes("admin");
  const [installments, invoices, spInfo] = await Promise.all([
    getInstallments(isAdmin ? undefined : user.partnerId),
    getInvoices(isAdmin ? undefined : user.partnerId),
    import("@/lib/sharepoint").then(m => m.getSharePointConnectionInfo()),
  ]);
  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return (
    <PortalShell
      roles={userRoles}
      userName={user.name || "User"}
      company={user.company}
      overdueCount={overdueCount}
      unpaidInvoicesCount={unpaidInvoicesCount}
      siteUrl={spInfo.siteUrl}
      listUrls={spInfo.listUrls}
    >
      <NotificationsLiveBridge />
      {children}
    </PortalShell>
  );
}
