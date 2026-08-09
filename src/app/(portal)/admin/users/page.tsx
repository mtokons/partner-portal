import { requireAdmin } from "@/lib/admin-guard";
import { getAllManagedUsers } from "@/lib/admin-users";
import UserManagementClient from "./UserManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentAdmin = await requireAdmin();
  const users = await getAllManagedUsers();

  return (
    <div className="p-6">
      <UserManagementClient initialUsers={users} currentAdminEmail={currentAdmin.email || undefined} />
    </div>
  );
}
