import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices } from "@/lib/sharepoint";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import ImpersonationBannerServer from "@/components/layout/ImpersonationBannerServer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  const isAdmin = userRoles.includes("admin");
  const isSchoolManager = userRoles.includes("school-manager");

  if (!isAdmin && !isSchoolManager) redirect("/login");

  // School managers only get school-admin console (no finance widgets needed)
  if (!isAdmin && isSchoolManager) {
    return (
      <ConsoleShell
        console="school-admin"
        roles={userRoles}
        userName={user.name || "School Admin"}
        company={user.company}
      >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    );
  }

  const [installments, invoices, spInfo] = await Promise.all([
    getInstallments(),
    getInvoices(),
    import("@/lib/sharepoint").then((m) => m.getSharePointConnectionInfo()),
  ]);

  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return (
    <>
      <ImpersonationBannerServer />
      <ConsoleShell
        console="admin"
      roles={userRoles}
      userName={user.name || "Admin"}
      company={user.company}
      overdueCount={overdueCount}
      unpaidInvoicesCount={unpaidInvoicesCount}
      siteUrl={spInfo.siteUrl}
      listUrls={spInfo.listUrls}
    >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    </>
  );
}

