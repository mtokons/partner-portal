import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/effective-user";
import { getMenuOverridesForUser } from "@/lib/menu-overrides";
import { getInstallments, getInvoices, getPartnerByEmail } from "@/lib/sharepoint";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import ImpersonationBannerServer from "@/components/layout/ImpersonationBannerServer";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");

  const userRoles = user.roles?.length ? user.roles : [user.role];

  const isPartner = userRoles.some((r) =>
    ["partner", "partner-individual", "partner-institutional"].includes(r.toLowerCase())
  );
  if (!isPartner) redirect("/login");

  // Real admin (not impersonating) can always access partner console
  const isAdmin = userRoles.some((r) => r.toLowerCase() === "admin");

  // Resolve partnerId: session value, else look up by the effective user's email.
  // Impersonated partner targets have no session partnerId, so resolve via email.
  let effectivePartnerId = user.partnerId;
  if (!effectivePartnerId && user.email) {
    const p = await getPartnerByEmail(user.email);
    effectivePartnerId = p?.id || "";
  }

  // Approval gate: unapproved partners (no partner record) go to pending page.
  // Skip for real admins and during impersonation (admin is inspecting the account).
  if (!effectivePartnerId && !isAdmin && !user.isImpersonating) redirect("/partner-pending");

  const [installments, invoices, spInfo, partnerData] = await Promise.all([
    getInstallments(effectivePartnerId),
    getInvoices(effectivePartnerId),
    import("@/lib/sharepoint").then((m) => m.getSharePointConnectionInfo()),
    user.email ? getPartnerByEmail(user.email) : Promise.resolve(null),
  ]);

  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  const { roleOverrides, userOverrides } = await getMenuOverridesForUser(user.email, userRoles);

  return (
    <>
      <ImpersonationBannerServer />
      <ConsoleShell
        console="partner"
      roles={userRoles}
      userName={user.name || "Partner"}
      company={user.company}
      overdueCount={overdueCount}
      unpaidInvoicesCount={unpaidInvoicesCount}
      siteUrl={spInfo.siteUrl}
      listUrls={spInfo.listUrls}
      tierStatus={partnerData?.tierStatus}
      marginPercentage={partnerData?.marginPercentage}
      partnerLogoUrl={partnerData?.logoUrl}
      roleMenuOverrides={roleOverrides}
      userMenuOverrides={userOverrides}
    >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    </>
  );
}
