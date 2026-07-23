import { notFound } from "next/navigation";
import { getCandidateDetailAction } from "../../actions";
import { CandidateDetailClient } from "./CandidateDetailClient";

export default async function CvSuiteCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCandidateDetailAction(id);
  if (!detail) notFound();

  return <CandidateDetailClient detail={detail} />;
}
