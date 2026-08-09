import { CandidateDetail } from "@/app/partner/candidates/[id]/page";

export default async function SccgCandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return CandidateDetail({ id, routeBase: "/sccg/candidates" });
}