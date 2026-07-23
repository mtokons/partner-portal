import { getAllCandidatesAction } from "../actions";
import { CandidatesPageClient } from "./CandidatesPageClient";

export default async function CvSuiteCandidatesPage() {
  const candidates = await getAllCandidatesAction();

  return <CandidatesPageClient candidates={candidates} />;
}
