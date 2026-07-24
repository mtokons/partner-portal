import { requireSchoolAccess } from "@/lib/admin-guard";
import ModelTestsClient from "./ModelTestsClient";

export const dynamic = "force-dynamic";

export default async function ModelTestsPage() {
  await requireSchoolAccess();

  // Check whether the Model Test FastAPI service is reachable (server-side).
  let serviceStatus: "ok" | "unavailable" = "unavailable";
  try {
    const base = process.env.MODEL_TEST_API_URL || "http://model-test:8002";
    const r = await fetch(`${base}/health`, { next: { revalidate: 30 } });
    if (r.ok) serviceStatus = "ok";
  } catch {
    /* unavailable */
  }

  return <ModelTestsClient serviceStatus={serviceStatus} />;
}
