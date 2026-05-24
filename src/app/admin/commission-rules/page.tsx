import { auth } from "@/auth";
import { getCommissionRules } from "@/lib/sharepoint";
import CommissionRulesClient from "./CommissionRulesClient";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";

export default async function CommissionRulesAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) {
    redirect("/dashboard");
  }

  // Bypassing the normal "active only" filter for admin view to show all rules (including paused)
  // In sharepoint.ts, getCommissionRules usually filters by active. 
  // For the admin page, we might want to see all of them.
  const rules = await getCommissionRules();

  return <CommissionRulesClient rules={rules} />;
}
