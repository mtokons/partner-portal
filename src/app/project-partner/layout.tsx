import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/effective-user";
import ConsoleShell from "@/components/layout/ConsoleShell";
import ImpersonationBannerServer from "@/components/layout/ImpersonationBannerServer";

export default async function ProjectPartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");

  const userRoles = user.roles?.length ? user.roles : [user.role];
  const allowed = userRoles.some((r) => ["project-partner", "project-partner-admin", "admin"].includes(r.toLowerCase()));
  if (!allowed) redirect("/login");

  return (
    <>
      <ImpersonationBannerServer />
      <ConsoleShell
        console="project-partner"
        roles={userRoles}
        userName={user.name || "Project Partner"}
        company={user.company || ""}
        overdueCount={0}
        unpaidInvoicesCount={0}
      >
        {children}
      </ConsoleShell>
    </>
  );
}
