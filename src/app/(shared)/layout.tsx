import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices, getPartnerByEmail } from "@/lib/sharepoint";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import { resolveConsole } from "@/lib/menu-engine";
import { getMenuOverridesForUser } from "@/lib/menu-overrides";
import { getImpersonationSession } from "@/lib/impersonation";
import ImpersonationBanner from "@/components/layout/ImpersonationBanner";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  // --- Impersonation: check for active "View As" session ---
  const impersonation = await getImpersonationSession();

  // When impersonating, render the target user's console instead of admin's
  const effectiveRoles = impersonation ? impersonation.targetRoles : userRoles;
  const effectiveName  = impersonation ? impersonation.targetName  : (user.name || "User");
  const effectiveCompany = user.company; // keep admin's company data

  // Determine which console to show
  const consoleName = resolveConsole(effectiveRoles);

  const isAdmin = userRoles.includes("admin");

  const [installments, invoices, spInfo, partnerData] = await Promise.all([
    getInstallments(isAdmin ? undefined : user.partnerId),
    getInvoices(isAdmin ? undefined : user.partnerId),
    import("@/lib/sharepoint").then((m) => m.getSharePointConnectionInfo()),
    user.email ? getPartnerByEmail(user.email) : Promise.resolve(null),
  ]);

  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  const { roleOverrides, userOverrides } = await getMenuOverridesForUser(
    impersonation ? impersonation.targetEmail : user.email,
    effectiveRoles
  );

  return (
    <>
      {impersonation && (
        <ImpersonationBanner
          adminName={impersonation.adminName}
          targetName={impersonation.targetName}
          targetEmail={impersonation.targetEmail}
          targetRoles={impersonation.targetRoles}
        />
      )}
      <ConsoleShell
        console={consoleName}
        roles={effectiveRoles}
        userName={effectiveName}
        company={effectiveCompany}
        overdueCount={overdueCount}
        unpaidInvoicesCount={unpaidInvoicesCount}
        siteUrl={spInfo.siteUrl}
        listUrls={spInfo.listUrls}
        tierStatus={partnerData?.tierStatus}
        marginPercentage={partnerData?.marginPercentage}
        roleMenuOverrides={roleOverrides}
        userMenuOverrides={userOverrides}
        impersonating={!!impersonation}
      >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    </>
  );
}
