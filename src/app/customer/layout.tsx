import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getNotifications } from "@/lib/sharepoint";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Header from "@/components/layout/Header";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");

  const user = session.user as SessionUser;
  if (user.role !== "customer") redirect("/customer-login");

  const notifications = await getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <CustomerSidebar unreadCount={unreadCount} />
      <Header
        userName={user.name || "Customer"}
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
