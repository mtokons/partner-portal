import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser, AppNotification } from "@/types";
import { getNotifications } from "@/lib/sharepoint";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell, Calendar, CheckCircle, CreditCard, AlertCircle, Info,
} from "lucide-react";
import MarkAllReadButton from "./MarkAllReadButton";

const notifIcon: Record<AppNotification["type"], React.FC<{ className?: string }>> = {
  session_scheduled: Calendar,
  session_completed: CheckCircle,
  session_reminder: Bell,
  payment_due: CreditCard,
  payment_received: CreditCard,
  payment_eligible: CreditCard,
  payment_approved: CreditCard,
  expert_assigned: Bell,
  general: Info,
};

export default async function ExpertNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  const notifications = await getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && <MarkAllReadButton userId={user.id} />}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = notifIcon[n.type] || Info;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  n.read ? "bg-white border-gray-100" : "bg-indigo-50 border-indigo-100"
                }`}
              >
                <div className={`mt-0.5 p-2 rounded-full ${n.read ? "bg-gray-100" : "bg-indigo-100"}`}>
                  <Icon className={`h-4 w-4 ${n.read ? "text-gray-500" : "text-indigo-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${n.read ? "text-gray-700" : "text-indigo-900"}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("en-GB")}{" "}
                    {new Date(n.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
