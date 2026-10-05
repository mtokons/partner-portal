import { requireAdmin } from "@/lib/admin-guard";
import { fetchAllUserActivities } from "@/app/actions/activity-logs";
import ActivityLogClient from "./ActivityLogClient";

export const dynamic = "force-dynamic";

export default async function AdminActivityLogPage() {
  const currentAdmin = await requireAdmin();
  const { logs, stats } = await fetchAllUserActivities();

  return (
    <div className="p-6">
      <ActivityLogClient
        initialLogs={logs}
        initialStats={stats}
        currentAdminEmail={currentAdmin.email || undefined}
      />
    </div>
  );
}
