import { fetchEmailTemplatesAction } from "./actions";
import EmailTemplatesClient from "./EmailTemplatesClient";
import { requirePermission } from "@/lib/permissions";

export const metadata = {
  title: "Email Templates | SCCG Partner Portal",
};

export default async function EmailTemplatesPage() {
  await requirePermission("admin.access");

  const res = await fetchEmailTemplatesAction();
  const templates = res.success && res.data ? res.data : [];

  return (
    <div className="max-w-5xl mx-auto py-8">
      <EmailTemplatesClient initialTemplates={templates} />
    </div>
  );
}
