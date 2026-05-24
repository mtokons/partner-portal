import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";

export default async function ExpertLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/expert-login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];
  if (!userRoles.includes("expert") && !userRoles.includes("teacher")) redirect("/expert-login");

  return (
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
  );
}
