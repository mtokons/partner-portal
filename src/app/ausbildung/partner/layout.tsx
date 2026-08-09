import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import ConsoleShell from "@/components/layout/ConsoleShell";
import { getMenuOverridesForUser } from "@/lib/menu-overrides";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import ImpersonationBannerServer from "@/components/layout/ImpersonationBannerServer";

export default async function AusbildungPartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  const isAllowed = userRoles.includes("ausbildung-partner") || userRoles.includes("admin");
  if (!isAllowed) redirect("/login");

  const { roleOverrides, userOverrides } = await getMenuOverridesForUser(user.email, userRoles);

  return (
    <>
      <ImpersonationBannerServer />
      <ConsoleShell
        console="ausbildung-partner"
        roles={userRoles}
        userName={user.name || "Ausbildung Partner"}
        company={user.company}
        roleMenuOverrides={roleOverrides}
        userMenuOverrides={userOverrides}
      >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    </>
  );
}
