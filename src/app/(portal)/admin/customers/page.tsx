import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getCustomers, getCustomerPackages } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
};

export default async function AdminCustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const [customers, packages] = await Promise.all([
    getCustomers(),
    getCustomerPackages(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Customers</h1>
        <p className="text-gray-500 text-sm mt-1">{customers.length} registered customers</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Customer Registry</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Packages</th>
                  <th className="pb-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const custPackages = packages.filter((p) => p.customerId === c.id);
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium">{c.name}</td>
                      <td className="py-3 text-gray-600">{c.email}</td>
                      <td className="py-3 text-gray-600">{c.company || "—"}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[c.status] || ""}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3">{custPackages.length}</td>
                      <td className="py-3 text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
