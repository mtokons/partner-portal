import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchTimelineCustomersAction } from "./actions";
import TimelineClient from "./TimelineClient";

export const dynamic = "force-dynamic";

export default async function ClientServiceTimelinePage() {
  await requireSccgAccess();
  const result = await fetchTimelineCustomersAction();

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-foreground">Client Service Timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a printable service plan template — contact details, plan, week/month timeline, and remarks.
        </p>
      </div>
      {!result.success || !result.data ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {result.error || "Failed to load customers."}
        </div>
      ) : (
        <TimelineClient customers={result.data} />
      )}
    </div>
  );
}
