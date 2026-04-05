import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getInstallments, getInvoices } from "@/lib/sharepoint";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

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
    <div className="min-h-screen bg-background">
      <Sidebar role={partnerOrAdminRole} />
      <Header
        userName={user.name || "User"}
        company={user.company}
        overdueCount={overdueCount}
        unpaidInvoicesCount={unpaidInvoicesCount}
      />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)]">
        <div className="p-7 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
