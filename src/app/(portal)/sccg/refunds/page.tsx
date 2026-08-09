import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchRefundRequestsAction } from "../finance/actions";
import RefundsClient from "./RefundsClient";

export const dynamic = "force-dynamic";

export default async function SccgRefundsPage() {
  await requireSccgAccess();
  const result = await fetchRefundRequestsAction();
  if (!result.success || !result.data) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">{result.error || "Failed to load refunds."}</div>;
  }
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-foreground">Refunds</h1><p className="mt-1 text-sm text-muted-foreground">Review partner refund requests and issue the approved refund through the transaction ledger.</p></div><RefundsClient transactions={result.data} /></div>;
}