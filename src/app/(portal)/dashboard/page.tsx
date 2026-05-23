import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import AdminDashboard from "./AdminDashboard";
import PartnerDashboard from "./PartnerDashboard";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.roles?.includes("admin") || user.role === "admin";

  if (isAdmin) {
    return <AdminDashboard user={user} />;
  }

  return <PartnerDashboard user={user} />;
}
