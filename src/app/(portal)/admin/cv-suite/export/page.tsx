import { getAllCandidatesAction } from "../actions";
import { ExportCenterClient } from "./ExportCenterClient";

export default async function ExportCenterPage() {
  const candidates = await getAllCandidatesAction();
  return <ExportCenterClient candidates={candidates} />;
}
