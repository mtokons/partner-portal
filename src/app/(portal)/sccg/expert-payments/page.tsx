import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchExpertPaymentsAction } from "../finance/actions";
import ExpertPaymentsClient from "./ExpertPaymentsClient";

export const dynamic = "force-dynamic";

export default async function SccgExpertPaymentsPage() {
  await requireSccgAccess();
  const result = await fetchExpertPaymentsAction();
  if (!result.success || !result.data) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">{result.error || "Failed to load expert payments."}</div>;
  }
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Expert Payments</h1><p className="mt-1 text-sm text-muted-foreground">Approve eligible session earnings and record completed payouts.</p></div>
      <ExpertPaymentsClient payments={result.data} />
    </div>
  );
}