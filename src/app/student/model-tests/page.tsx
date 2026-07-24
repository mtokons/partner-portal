import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/effective-user";
import ModelTestsClient from "@/app/admin/school/model-tests/ModelTestsClient";

export const dynamic = "force-dynamic";

export default async function StudentModelTestsPage() {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");
  return <ModelTestsClient variant="student" />;
}
