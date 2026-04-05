import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getExperts, getCustomerPackages } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AssignExpertButton from "./AssignExpertButton";
import ExpertRate from "@/components/ExpertRate";

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  "on-leave": "bg-yellow-100 text-yellow-700",
};

export default async function AdminExpertsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const [experts, packages] = await Promise.all([
    getExperts(),
    getCustomerPackages(),
  ]);

  const unassignedPackages = packages.filter((p) => !p.expertId && p.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Experts</h1>
          <p className="text-gray-500 text-sm mt-1">{experts.length} registered experts</p>
        </div>
        {unassignedPackages.length > 0 && (
          <span className="text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1.5 rounded-lg">
            {unassignedPackages.length} package{unassignedPackages.length !== 1 ? "s" : ""} need an expert
          </span>
        )}
      </div>

      {/* Unassigned Packages */}
      {unassignedPackages.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Unassigned Packages</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unassignedPackages.map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div>
                    <p className="text-sm font-medium">{pkg.customerName}</p>
                    <p className="text-xs text-gray-500">{pkg.packageName} · {pkg.totalSessions} sessions</p>
                  </div>
                  <AssignExpertButton
                    packageId={pkg.id}
                    packageName={pkg.packageName}
                    customerName={pkg.customerName || "Customer"}
                    experts={experts.filter((e) => e.status === "active")}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Experts */}
      {/* fetch conversion rate to show BDT equivalents when available */}
      {/* server-side import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {experts.map((expert) => {
          const assignedPackages = packages.filter((p) => p.expertId === expert.id);
          return (
            <Card key={expert.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{expert.name}</CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[expert.status]}`}>
                    {expert.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{expert.email}</p>
                  <p className="text-xs text-gray-500">{expert.specialization}</p>
                  {expert.bio && <p className="text-xs text-gray-400 italic">{expert.bio}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">⭐ {expert.rating}</span>
                  <span className="text-gray-500">{expert.totalSessionsCompleted} sessions completed</span>
                  <ExpertRate rateEur={expert.ratePerSession} />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">{assignedPackages.length} assigned package{assignedPackages.length !== 1 ? "s" : ""}</p>
                  {assignedPackages.slice(0, 3).map((p) => (
                    <p key={p.id} className="text-xs text-gray-600">· {p.customerName} — {p.packageName}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
