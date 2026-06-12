import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices, getPartnerByEmail } from "@/lib/sharepoint";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  const isPartner = userRoles.some((r) =>
    ["partner", "partner-individual", "partner-institutional"].includes(r.toLowerCase())
  );
  if (!isPartner) redirect("/login");

  // Admin can always access partner console
  const isAdmin = userRoles.some((r) => r.toLowerCase() === "admin");

  // Approval gate: unapproved partners go to pending page (skip for admin)
  if (!user.partnerId && !isAdmin) redirect("/partner-pending");

  // For admin without partnerId, resolve from SharePoint
  let effectivePartnerId = user.partnerId;
  if (!effectivePartnerId && isAdmin && user.email) {
    const p = await getPartnerByEmail(user.email);
    effectivePartnerId = p?.id || "";
  }

  const [installments, invoices, spInfo, partnerData] = await Promise.all([
    getInstallments(effectivePartnerId),
    getInvoices(effectivePartnerId),
    import("@/lib/sharepoint").then((m) => m.getSharePointConnectionInfo()),
    user.email ? getPartnerByEmail(user.email) : Promise.resolve(null),
  ]);

  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return (
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
    >
      <NotificationsLiveBridge />
      {children}
    </ConsoleShell>
  );
}
