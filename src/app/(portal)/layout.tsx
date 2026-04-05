import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices } from "@/lib/sharepoint";
import PortalShell from "@/components/layout/PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;

  if (user.role !== "partner" && user.role !== "admin") redirect("/login");

  const partnerOrAdminRole = user.role as "partner" | "admin";
  const installments = await getInstallments(user.role === "admin" ? undefined : user.partnerId);
  const invoices = await getInvoices(user.role === "admin" ? undefined : user.partnerId);
  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return (
    <PortalShell
      role={partnerOrAdminRole}
      userName={user.name || "User"}
      company={user.company}
      overdueCount={overdueCount}
      unpaidInvoicesCount={unpaidInvoicesCount}
    >
      {children}
    </PortalShell>
  );
}
