import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { isAdminEquivalent } from "@/lib/admin-guard";
import CustomersClient from "./CustomersClient";
import { fetchCustomersDataAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = isAdminEquivalent(roles);

  if (!isAdmin) {
    redirect("/access-denied");
  }

  const result = await fetchCustomersDataAction();
  const data = result.data || {
    customers: [],
    partners: [],
    stats: {
      totalCustomers: 0,
      directSccg: 0,
      partnerReferred: 0,
      runningServicesCount: 0,
      completedServicesCount: 0,
      totalRevenue: 0,
      totalDue: 0,
    },
  };

  return (
    <CustomersClient
      initialCustomers={data.customers}
      partners={data.partners}
      stats={data.stats}
    />
  );
}
