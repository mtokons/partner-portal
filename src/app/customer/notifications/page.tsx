import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getNotifications } from "@/lib/sharepoint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, CreditCard, CheckCircle, Info } from "lucide-react";
import MarkAllReadButton from "./MarkAllReadButton";
import NotificationItem from "@/components/NotificationItem";
import { notificationHref } from "@/lib/notification-routes";

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  payment_due: CreditCard,
  payment_received: CheckCircle,
  session_scheduled: Calendar,
  session_completed: CheckCircle,
  session_reminder: Calendar,
  expert_assigned: Info,
  general: Bell,
};

const typeColor: Record<string, string> = {
  payment_due: "text-orange-600",
  payment_received: "text-green-600",
  session_scheduled: "text-blue-600",
  session_completed: "text-green-600",
  session_reminder: "text-blue-600",
  expert_assigned: "text-purple-600",
  general: "text-gray-600",
};

export default async function CustomerNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");
  const user = session.user as SessionUser;

  const notifications = await getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && <MarkAllReadButton userId={user.id} />}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {notifications.map((notif) => {
              const Icon = typeIcon[notif.type] || Bell;
              const color = typeColor[notif.type] || "text-gray-600";
              const href = notificationHref(notif, "customer");
              return (
                <NotificationItem
                  key={notif.id}
                  id={notif.id}
                  href={href}
                  read={notif.read}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-gray-50 ${!notif.read ? "bg-teal-50 border-teal-200" : "bg-white border-gray-100"}`}
                >
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium text-sm ${!notif.read ? "text-gray-900" : "text-gray-700"}`}>
                        {notif.title}
                      </p>
                      {!notif.read && <Badge className="bg-teal-600 text-white text-xs shrink-0">New</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString("en-GB")}</p>
                  </div>
                </NotificationItem>
              );
            })}
            {notifications.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No notifications yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
