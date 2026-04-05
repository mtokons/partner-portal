import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import type { SessionUser } from "@/types";
import { getCustomerPackages, getSessionsByPackage } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function CustomerPackagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");
  const user = session.user as SessionUser;

  const [packages, rate] = await Promise.all([getCustomerPackages(user.id), loadRate()]);

  const packagesWithSessions = await Promise.all(
    packages.map(async (pkg) => {
      const sessions = await getSessionsByPackage(pkg.id);
      return { ...pkg, sessions };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Packages</h1>

      {packagesWithSessions.map((pkg) => {
        const remaining = pkg.totalSessions - pkg.completedSessions;
        const scheduled = pkg.sessions.filter((s) => s.status === "scheduled").length;
        const progressPct = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
        const amountDue = pkg.totalAmount - pkg.amountPaid;

        return (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{pkg.packageName}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {pkg.expertName
                      ? <>Expert: <span className="font-medium text-gray-700">{pkg.expertName}</span></>
                      : <span className="text-orange-600">Expert being assigned…</span>}
                  </p>
                </div>
                <Badge className={pkg.status === "active" ? "bg-green-100 text-green-800" : pkg.status === "completed" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                  {pkg.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Session progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Session Progress</span>
                  <span className="font-medium">{pkg.completedSessions} / {pkg.totalSessions}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="bg-teal-500 h-3 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="text-green-600 font-medium">{pkg.completedSessions} completed</span>
                  <span className="text-blue-600 font-medium">{scheduled} scheduled</span>
                  <span className="text-gray-500">{remaining - scheduled} pending</span>
                </div>
              </div>

              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Total Value</p>
                  <p className="font-bold text-gray-900">{fmtBdt(pkg.totalAmount, rate, { compact: true })}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Amount Paid</p>
                  <p className="font-bold text-green-600">{fmtBdt(pkg.amountPaid, rate, { compact: true })}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Outstanding</p>
                  <p className={`font-bold ${amountDue > 0 ? "text-orange-600" : "text-green-600"}`}>{fmtBdt(amountDue, rate, { compact: true })}</p>
                </div>
              </div>

              {/* Date range */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Started: {new Date(pkg.startDate).toLocaleDateString("en-GB")}</span>
                <span>Valid until: {new Date(pkg.endDate).toLocaleDateString("en-GB")}</span>
              </div>

              {/* Sessions list */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Sessions</p>
                <div className="space-y-1">
                  {pkg.sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                      <span className="text-gray-400 w-24 shrink-0">Session {s.sessionNumber}</span>
                      <Badge
                        className={s.status === "completed" ? "bg-green-100 text-green-800" : s.status === "scheduled" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}
                      >
                        {s.status}
                      </Badge>
                      <span className="text-xs text-gray-500 flex-1">
                        {s.status === "completed" && s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-GB") : ""}
                        {s.status === "scheduled" && s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString("en-GB") : ""}
                      </span>
                      {s.notes && <span className="text-xs text-gray-400 truncate max-w-[200px]">{s.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {amountDue > 0 && (
                <Link href="/customer/payments">
                  <span className="block text-center text-sm bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors cursor-pointer">
                    Pay Outstanding Balance ({fmtBdt(amountDue, rate, { compact: true })})
                  </span>
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}

      {packagesWithSessions.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No packages yet. Contact your partner to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


