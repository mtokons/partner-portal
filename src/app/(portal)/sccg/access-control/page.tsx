import { requireSccgAdmin } from "@/lib/admin-guard";
import { getAllManagedUsers } from "@/lib/admin-users";
import UserManagementClient from "@/app/(portal)/admin/users/UserManagementClient";
export const dynamic = "force-dynamic";
export default async function AccessControlPage() { const admin = await requireSccgAdmin(); const users = await getAllManagedUsers(); return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Access Control & Role Management</h1><p className="mt-1 text-sm text-muted-foreground">Manage user status and role assignments through the shared identity service.</p></div><UserManagementClient initialUsers={users} currentAdminEmail={admin.email || undefined} /></div>; }