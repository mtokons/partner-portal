import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import ConsoleShell from "@/components/layout/ConsoleShell";
import NotificationsLiveBridge from "@/components/providers/NotificationsLiveBridge";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];
  if (!userRoles.includes("customer")) redirect("/customer-login");

  return (
    <ConsoleShell
      console="customer"
      roles={userRoles}
      userName={user.name || "Customer"}
      company={user.company}
      overdueCount={0}
      unpaidInvoicesCount={0}
    >
      <NotificationsLiveBridge />
      {children}
    </ConsoleShell>
  );
}
