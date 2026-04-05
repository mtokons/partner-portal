import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser, Session } from "@/types";
import { getCustomerPackages, getSessionsByPackage } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusColor: Record<Session["status"], string> = {
  completed: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  pending: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  rescheduled: "bg-yellow-100 text-yellow-700",
};

export default async function AdminSessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const packages = await getCustomerPackages();

  const allSessions = (
    await Promise.all(packages.map((p) => getSessionsByPackage(p.id)))
  ).flat();

  const grouped: Record<string, typeof allSessions> = {
    scheduled: allSessions.filter((s) => s.status === "scheduled"),
    pending: allSessions.filter((s) => s.status === "pending"),
    completed: allSessions.filter((s) => s.status === "completed"),
    cancelled: allSessions.filter((s) => s.status === "cancelled"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Sessions</h1>
        <p className="text-gray-500 text-sm mt-1">{allSessions.length} sessions across all packages</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(grouped).map(([status, items]) => (
          <Card key={status}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 capitalize">{status}</p>
              <p className="text-2xl font-bold mt-1">{items.length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session table */}
      <Card>
        <CardHeader><CardTitle>Session Registry</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Expert</th>
                  <th className="pb-3 font-medium">Session</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {allSessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5">{s.customerName}</td>
                    <td className="py-2.5">{s.expertName || <span className="text-gray-400 italic">Unassigned</span>}</td>
                    <td className="py-2.5">{s.sessionNumber}/{s.totalSessions}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500">
                      {s.scheduledAt
                        ? new Date(s.scheduledAt).toLocaleDateString("en-GB")
                        : s.completedAt
                        ? new Date(s.completedAt).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
