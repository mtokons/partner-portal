import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getCustomerPackages, getSessionsByExpert } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function ExpertClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  const [allPackages, sessions] = await Promise.all([
    getCustomerPackages(),
    getSessionsByExpert(user.id),
  ]);

  const myPackages = allPackages.filter((p) => p.expertId === user.id);

  // Build per-client summary
  const clientMap = new Map<string, {
    customerId: string;
    customerName: string;
    packages: typeof myPackages;
    totalSessions: number;
    completedSessions: number;
  }>();

  for (const pkg of myPackages) {
    const existing = clientMap.get(pkg.customerId);
    if (existing) {
      existing.packages.push(pkg);
      existing.totalSessions += pkg.totalSessions;
      existing.completedSessions += pkg.completedSessions;
    } else {
      clientMap.set(pkg.customerId, {
        customerId: pkg.customerId,
        customerName: pkg.customerName || pkg.customerId,
        packages: [pkg],
        totalSessions: pkg.totalSessions,
        completedSessions: pkg.completedSessions,
      });
    }
  }

  const clients = Array.from(clientMap.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
        <p className="text-sm text-gray-500">{clients.length} active client{clients.length !== 1 ? "s" : ""}</p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No clients assigned yet. Contact your administrator.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <Card key={client.customerId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{client.customerName}</CardTitle>
                  <Badge variant="outline" className="text-indigo-700 border-indigo-200">
                    {client.packages.length} package{client.packages.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {client.packages.map((pkg) => {
                    const pct = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
                    const remaining = pkg.totalSessions - pkg.completedSessions;
                    return (
                      <div key={pkg.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{pkg.packageName}</p>
                          <Badge
                            variant="outline"
                            className={
                              pkg.status === "active"
                                ? "text-green-700 border-green-200"
                                : pkg.status === "completed"
                                ? "text-gray-600 border-gray-200"
                                : "text-yellow-700 border-yellow-200"
                            }
                          >
                            {pkg.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {pkg.completedSessions}/{pkg.totalSessions} sessions completed · {remaining} remaining
                        </p>
                        {pkg.endDate && (
                          <p className="text-xs text-gray-400 mt-1">
                            Valid until {new Date(pkg.endDate).toLocaleDateString("en-GB")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t flex gap-4 text-sm text-gray-600">
                  <span>
                    <strong>{client.completedSessions}</strong>/{client.totalSessions} total sessions
                  </span>
                  <Link href="/expert/sessions" className="text-indigo-600 hover:underline">
                    View sessions →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
