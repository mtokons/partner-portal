import { requireSchoolAccess } from "@/lib/admin-guard";
import BuilderClient from "./BuilderClient";

export const dynamic = "force-dynamic";

export default async function ModelTestBuilderPage() {
  await requireSchoolAccess();
  return <BuilderClient />;
}
