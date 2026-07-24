import { requirePpmsManager } from "@/lib/ppms-guard";
import { listPpmsUsers } from "@/lib/ppms-users";
import UsersManageClient from "./UsersManageClient";

export const dynamic = "force-dynamic";

export default async function ManageUsersPage() {
  const ctx = await requirePpmsManager();
  const orgId = ctx.org?.id || ctx.allOrgs[0]?.id || "";
  const orgName = ctx.org?.name || ctx.allOrgs[0]?.name || "";
  const users = orgId ? await listPpmsUsers(orgId) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Viewers can read dashboards &amp; matrices but cannot edit. Org admins have full CRUD.</p>
      </div>
      {!orgId ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No organisation resolved for your account.</p>
      ) : (
        <UsersManageClient orgId={orgId} orgName={orgName} users={users} canCreateAdmin={ctx.isSccgAdmin} />
      )}
    </div>
  );
}
