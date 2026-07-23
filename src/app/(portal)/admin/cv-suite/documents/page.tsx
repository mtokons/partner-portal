import { getDocumentCompletenessAction } from "../actions";
import { DocumentsClient } from "./DocumentsClient";

export default async function DocumentsPage() {
  const data = await getDocumentCompletenessAction();
  return <DocumentsClient data={data} />;
}
