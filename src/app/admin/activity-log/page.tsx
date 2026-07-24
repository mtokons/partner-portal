import { requireAdmin } from "@/lib/admin-guard";
import { getActivityLogs } from "@/lib/sharepoint";
import ActivityLogClient from "./ActivityLogClient";

export const metadata = {
  title: "Activity Log | Admin",
};

export default async function ActivityLogPage() {
  await requireAdmin();
  const logs = await getActivityLogs({ limit: 500 });
  return <ActivityLogClient initialLogs={logs} />;
}
