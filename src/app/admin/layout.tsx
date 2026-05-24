import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices } from "@/lib/sharepoint";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  if (!userRoles.includes("admin")) redirect("/login");

  const [installments, invoices, spInfo] = await Promise.all([
    getInstallments(),
    getInvoices(),
    import("@/lib/sharepoint").then((m) => m.getSharePointConnectionInfo()),
  ]);

  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return (
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
  );
}
