import UsersClient from "./UsersClient";
import { requireAdmin } from "@/lib/admin-guard";

export const metadata = {
  title: "Manage Users | Admin",
};

export default async function UsersPage() {
  await requireAdmin();
  return <UsersClient />;
}
