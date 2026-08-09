import { requireSccgAdmin } from "@/lib/admin-guard";
import { getMarketingMaterialsAction } from "./actions";
import MarketingMaterialsClient from "./MarketingMaterialsClient";
export const dynamic = "force-dynamic";
export default async function MarketingMaterialsPage() { await requireSccgAdmin(); const materials = await getMarketingMaterialsAction(); return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Marketing Materials</h1><p className="mt-1 text-sm text-muted-foreground">Upload and distribute current SCCG marketing assets.</p></div><MarketingMaterialsClient materials={materials} /></div>; }