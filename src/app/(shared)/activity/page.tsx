import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getActivities } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeColor: Record<string, string> = {
  order: "bg-blue-100 text-blue-800",
  client: "bg-green-100 text-green-800",
  payment: "bg-emerald-100 text-emerald-800",
  installment: "bg-purple-100 text-purple-800",
  login: "bg-gray-100 text-gray-800",
  expense: "bg-orange-100 text-orange-800",
  invoice: "bg-indigo-100 text-indigo-800",
};

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const activities = await getActivities(user.role === "admin" ? undefined : user.partnerId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                <Badge className={typeColor[activity.type] || "bg-gray-100 text-gray-800"}>
                  {activity.type}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-center text-gray-400 py-8">No activities yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
