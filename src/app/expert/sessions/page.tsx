import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser, Session } from "@/types";
import { getSessionsByExpert } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const statusColor: Record<Session["status"], string> = {
  completed: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  pending: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  rescheduled: "bg-yellow-100 text-yellow-700",
};

export default async function ExpertSessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  const sessions = await getSessionsByExpert(user.id);

  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const pending = sessions.filter((s) => s.status === "pending");
  const completed = sessions.filter((s) => s.status === "completed");

  const groups = [
    { label: "Scheduled", items: upcoming },
    { label: "Pending", items: pending },
    { label: "Completed", items: completed },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>

      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {group.label} ({group.items.length})
          </h2>
          {group.items.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">None.</p>
          ) : (
            <div className="space-y-2">
              {group.items.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{s.customerName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[s.status]}`}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Session {s.sessionNumber}/{s.totalSessions}
                        {s.scheduledAt && ` · ${new Date(s.scheduledAt).toLocaleDateString("en-GB")} ${new Date(s.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                        {s.completedAt && ` · Completed ${new Date(s.completedAt).toLocaleDateString("en-GB")}`}
                        {s.durationMinutes && ` · ${s.durationMinutes} min`}
                        {s.customerRating && ` · ⭐ ${s.customerRating}`}
                      </p>
                      {s.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>
                      )}
                    </div>
                    {(s.status === "scheduled" || s.status === "completed") && (
                      <Link href={`/expert/sessions/${s.id}`} className="text-sm text-indigo-600 hover:underline whitespace-nowrap">
                        {s.status === "scheduled" ? "Complete →" : "View →"}
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
