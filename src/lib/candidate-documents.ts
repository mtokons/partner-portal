/**
 * Shared helper for listing a candidate's uploaded documents from the
 * SharePoint "CandidateDocs" drive folder. Used by both the partner-scoped
 * document viewer and the SCCG Candidate Sharing wizard.
 */
export interface CandidateDocument {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  downloadUrl: string;
  createdAt: string;
}

export async function listCandidateDocuments(
  candidateId: string,
  candidateName: string
): Promise<CandidateDocument[]> {
  const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
  const client = await getGraphClient();
  const siteId = await resolveSiteId();

  const mapItems = (value: any[]): CandidateDocument[] =>
    (value || [])
      .filter((item: any) => item.file) // only files, skip nested folders
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        downloadUrl: item["@microsoft.graph.downloadUrl"] || item.webUrl,
        createdAt: item.createdDateTime,
      }));

  const sanitizedName = candidateName ? candidateName.replace(/[^a-zA-Z0-9_-]/g, " ").trim() : "Unknown_Candidate";
  const folderName = `${sanitizedName} - ${candidateId}`;
  const folderPath = `CandidateDocs/${folderName}`;
  const url = `/sites/${siteId}/drive/root:/${folderPath}:/children`;

  // 1) Try the exact expected folder path first (fast path).
  try {
    const res = await client.api(url).get();
    const items = mapItems(res.value);
    if (items.length > 0) return items;
  } catch (err: any) {
    if (err.statusCode !== 404) throw err;
    // fall through to suffix matching
  }

  // 2) Fallback: the folder may exist under a slightly different name portion
  //    (e.g. the candidate was renamed, or the typed name differed from the
  //    stored name at upload time). Match any folder ending with the stable
  //    " - {candidateId}" suffix so documents never appear to "vanish".
  try {
    const rootUrl = `/sites/${siteId}/drive/root:/CandidateDocs:/children`;
    const rootRes = await client.api(rootUrl).get();
    const suffix = ` - ${candidateId}`;
    const match = (rootRes.value || []).find(
      (f: any) => f.folder && typeof f.name === "string" && f.name.endsWith(suffix)
    );
    if (!match) return [];
    const childRes = await client.api(`/sites/${siteId}/drive/items/${match.id}/children`).get();
    return mapItems(childRes.value);
  } catch (err: any) {
    if (err.statusCode === 404) return [];
    throw err;
  }
}
