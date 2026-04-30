import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getNotifications } from "@/lib/sharepoint";
import ExpertSidebar from "@/components/layout/ExpertSidebar";
import Header from "@/components/layout/Header";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";

export default async function ExpertLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/expert-login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];
  if (!userRoles.includes("expert") && !userRoles.includes("teacher")) redirect("/expert-login");

  const notifications = await getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <NotificationsLiveBridge />
      <ExpertSidebar unreadCount={unreadCount} />
      <Header
        userName={user.name || "Expert"}
        company={user.company || ""}
        overdueCount={0}
        unpaidInvoicesCount={0}
      />
      <main className="ml-64 mt-16 p-6">
        {children}
      </main>
    </div>
  );
}
