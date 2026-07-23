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

  let installments: any[] = [];
  let invoices: any[] = [];
  let spInfo = { siteUrl: "", listUrls: {} };

  try {
    const res = await Promise.all([
      getInstallments(isAdmin ? undefined : user.partnerId).catch(() => []),
      getInvoices(isAdmin ? undefined : user.partnerId).catch(() => []),
      import("@/lib/sharepoint")
        .then((m) => m.getSharePointConnectionInfo())
        .catch(() => ({ siteUrl: "", listUrls: {} })),
    ]);
    installments = res[0] || [];
    invoices = res[1] || [];
    spInfo = res[2] || { siteUrl: "", listUrls: {} };
  } catch (err) {
    console.error("PortalLayout SharePoint fetch error:", err);
  }

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
