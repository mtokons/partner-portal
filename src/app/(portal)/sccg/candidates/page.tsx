import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { getCandidates, getCandidateServices, getProducts } from "@/lib/sharepoint";
import CandidateListClient from "@/app/partner/candidates/CandidateListClient";

export default async function SccgCandidatesPage() {
  await requirePermission("candidate.view.all");
  const [candidates, products] = await Promise.all([getCandidates(), getProducts()]);
  const candidatesWithServices = await Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      services: await getCandidateServices(candidate.id),
    }))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Candidate Gallery</h1>
          <span className="text-sm text-muted-foreground">({candidates.length})</span>
        </div>
        <Link href="/sccg/candidates/new" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90">
          <UserPlus className="w-4 h-4" /> Register Candidate
        </Link>
      </div>
      <CandidateListClient candidates={candidatesWithServices} products={products} routeBase="/sccg/candidates" secondaryCurrency="EUR" exchangeRate={1} />
    </div>
  );
}