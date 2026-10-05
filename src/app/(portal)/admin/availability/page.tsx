import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/effective-user";
import { AvailabilityManager } from "@/components/availability/AvailabilityManager";
import { AVAILABILITY_CONFIG } from "@/lib/availability-config";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage() {
  const user = await getEffectiveUser();
  if (!user) {
    redirect("/auth/signin?callbackUrl=/admin/availability");
  }

  const userRoles = (user.roles || [user.role]).map((r) => r.toLowerCase().trim());
  const isManager = userRoles.some((r) =>
    AVAILABILITY_CONFIG.managerRoles.map((m) => m.toLowerCase()).includes(r)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AvailabilityManager
        currentUserId={user.id}
        currentUserEmail={user.email}
        currentUserName={user.name || user.email.split("@")[0]}
        currentUserDept={user.company}
        userRoles={userRoles}
        initialIsManager={isManager}
        baseConsole="admin"
      />
    </div>
  );
}
