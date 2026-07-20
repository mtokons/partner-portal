import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import ImpersonationBannerServer from "@/components/layout/ImpersonationBannerServer";

export default async function AusbildungSeekerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  const isAllowed = userRoles.includes("ausbildung-seeker") || userRoles.includes("admin");
  if (!isAllowed) redirect("/login");

  return (
    <>
      <ImpersonationBannerServer />
      <ConsoleShell
        console="ausbildung-seeker"
        roles={userRoles}
        userName={user.name || "Ausbildung Seeker"}
        company={user.company}
      >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    </>
  );
}
