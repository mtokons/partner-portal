import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchSessionOverviewAction } from "./actions";
import SessionOverviewClient from "./SessionOverviewClient";

export const dynamic = "force-dynamic";

export default async function ExpertSessionOverviewPage() {
  await requireSccgAccess();
  const result = await fetchSessionOverviewAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Expert Session Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All expert-delivered sessions across clients — filter by expert, status, or date.
        </p>
      </div>
      {!result.success || !result.data ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {result.error || "Failed to load sessions."}
        </div>
      ) : (
        <SessionOverviewClient sessions={result.data.sessions} experts={result.data.experts} />
      )}
    </div>
  );
}
