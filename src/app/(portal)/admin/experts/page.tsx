import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { isAdminEquivalent } from "@/lib/admin-guard";
import ExpertsClient from "./ExpertsClient";
import { fetchUnifiedExpertsDataAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminExpertsPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = isAdminEquivalent(roles);

  if (!isAdmin) {
    redirect("/access-denied");
  }

  const result = await fetchUnifiedExpertsDataAction();
  const data = result.data || {
    experts: [],
    stats: {
      totalExperts: 0,
      serviceExpertsCount: 0,
      projectExpertsCount: 0,
      totalSessionsCount: 0,
      completedSessionsCount: 0,
      totalPaidEur: 0,
      totalPendingEur: 0,
    },
  };

  return (
    <ExpertsClient
      initialExperts={data.experts}
      stats={data.stats}
    />
  );
}
