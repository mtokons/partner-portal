import { requirePpmsManager } from "@/lib/ppms-guard";
import OrgManageClient from "./OrgManageClient";

export const dynamic = "force-dynamic";

export default async function ManageOrgPage() {
  const ctx = await requirePpmsManager();
  const org = ctx.org || ctx.allOrgs[0] || null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Organisation</h1>
        <p className="text-sm text-muted-foreground">Branding and settings for your partner organisation.</p>
      </div>
      <OrgManageClient org={org} canCreate={ctx.isSccgAdmin} />
    </div>
  );
}
