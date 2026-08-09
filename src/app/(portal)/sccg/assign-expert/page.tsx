import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchAssignExpertDataAction } from "./actions";
import AssignExpertClient from "./AssignExpertClient";

export const dynamic = "force-dynamic";

export default async function AssignExpertPage() {
  await requireSccgAccess();
  const result = await fetchAssignExpertDataAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assign Expert</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign experts to client service packages, schedule sessions, and send meeting links.
        </p>
      </div>
      {!result.success || !result.data ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {result.error || "Failed to load data."}
        </div>
      ) : (
        <AssignExpertClient packages={result.data.packages} experts={result.data.experts} />
      )}
    </div>
  );
}
