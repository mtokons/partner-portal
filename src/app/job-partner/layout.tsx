import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";
import ImpersonationBannerServer from "@/components/layout/ImpersonationBannerServer";

export default async function JobPartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];

  const isAllowed = userRoles.includes("job-partner") || userRoles.includes("admin");
  if (!isAllowed) redirect("/login");

  return (
    <>
      <ImpersonationBannerServer />
      <ConsoleShell
        console="job-partner"
        roles={userRoles}
        userName={user.name || "Job Partner"}
        company={user.company}
      >
        <NotificationsLiveBridge />
        {children}
      </ConsoleShell>
    </>
  );
}
