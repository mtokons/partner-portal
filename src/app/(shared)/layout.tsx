import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices, getPartnerByEmail } from "@/lib/sharepoint";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import { resolveConsole } from "@/lib/menu-engine";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  // Determine which console this user primarily belongs to
  const consoleName = resolveConsole(userRoles);

  const isAdmin = userRoles.includes("admin");

  const [installments, invoices, spInfo, partnerData] = await Promise.all([
    getInstallments(isAdmin ? undefined : user.partnerId),
    getInvoices(isAdmin ? undefined : user.partnerId),
    import("@/lib/sharepoint").then((m) => m.getSharePointConnectionInfo()),
    user.email ? getPartnerByEmail(user.email) : Promise.resolve(null),
  ]);

  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return (
    <ConsoleShell
      console={consoleName}
      roles={userRoles}
      userName={user.name || "User"}
      company={user.company}
      overdueCount={overdueCount}
      unpaidInvoicesCount={unpaidInvoicesCount}
      siteUrl={spInfo.siteUrl}
      listUrls={spInfo.listUrls}
      tierStatus={partnerData?.tierStatus}
      marginPercentage={partnerData?.marginPercentage}
    >
      <NotificationsLiveBridge />
      {children}
    </ConsoleShell>
  );
}
