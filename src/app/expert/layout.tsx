import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/effective-user";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import ImpersonationBannerServer from "@/components/layout/ImpersonationBannerServer";

export default async function ExpertLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveUser();
  if (!user) redirect("/expert-login");

  const userRoles = user.roles?.length ? user.roles : [user.role];
  if (!userRoles.includes("expert") && !userRoles.includes("teacher")) redirect("/expert-login");

  return (
    <>
      <ImpersonationBannerServer />
      <ConsoleShell
        console="expert"
      roles={userRoles}
      userName={user.name || "Expert"}
      company={user.company}
      overdueCount={0}
      unpaidInvoicesCount={0}
    >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    </>
  );
}
