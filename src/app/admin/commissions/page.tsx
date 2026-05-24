import { auth } from "@/auth";
import { getCommissionLedger } from "@/lib/sharepoint";
import AdminCommissionsClient from "./AdminCommissionsClient";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";

export default async function AdminCommissionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) {
    redirect("/dashboard");
  }

  // Fetch all commission entries (global view)
  const entries = await getCommissionLedger();

  return <AdminCommissionsClient entries={entries} />;
}
