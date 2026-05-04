import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getActivities, getOrders, getClients, getGiftCards } from "@/lib/sharepoint";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const partnerId = user.role === "admin" ? undefined : user.partnerId;
  const [activities, orders, clients, cards] = await Promise.all([
    getActivities(partnerId).then((a) => a.slice(0, 10)),
    getOrders(partnerId),
    getClients(partnerId),
    getGiftCards(user.id),
  ]);

  // Activity chart data — group by month
  const activityByMonth: Record<string, number> = {};
  activities.forEach((a) => {
    const m = (a.createdAt || a.date || new Date().toISOString()).slice(0, 7);
    activityByMonth[m] = (activityByMonth[m] || 0) + 1;
  });
  const chartData = Object.entries(activityByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  // Stats
  const stats = {
    totalOrders: orders.length,
    totalClients: clients.length,
    recentActivities: activities.length,
    deliveredOrders: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name || "User",
        email: user.email || "",
        role: user.role,
        company: user.company,
        partnerId: user.partnerId,
      }}
      activities={activities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt || a.date || new Date().toISOString(),
      }))}
      chartData={chartData}
      stats={stats}
      card={cards[0] || null}
    />
  );
}
