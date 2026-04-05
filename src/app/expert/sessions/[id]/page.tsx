import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import type { SessionUser } from "@/types";
import { getSessionById, getCustomerPackageById } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CompleteSessionButton from "./CompleteSessionButton";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authSession = await auth();
  if (!authSession?.user) redirect("/expert-login");
  const user = authSession.user as SessionUser;

  const session = await getSessionById(id);
  if (!session || session.expertId !== user.id) notFound();

  const pkg = await getCustomerPackageById(session.customerPackageId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Session {session.sessionNumber}/{session.totalSessions} — {session.customerName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Package: {pkg?.packageName || session.customerPackageId}
        </p>
      </div>

      {/* Session details */}
      <Card>
        <CardHeader><CardTitle>Session Information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Status</p>
              <Badge
                variant="outline"
                className={
                  session.status === "completed"
                    ? "text-green-700 border-green-200"
                    : session.status === "scheduled"
                    ? "text-blue-700 border-blue-200"
                    : "text-gray-600 border-gray-200"
                }
              >
                {session.status}
              </Badge>
            </div>
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-medium">{session.customerName}</p>
            </div>
            {session.scheduledAt && (
              <div>
                <p className="text-gray-500">Scheduled</p>
                <p className="font-medium">
                  {new Date(session.scheduledAt).toLocaleDateString("en-GB")}{" "}
                  {new Date(session.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
            {session.completedAt && (
              <div>
                <p className="text-gray-500">Completed</p>
                <p className="font-medium">{new Date(session.completedAt).toLocaleDateString("en-GB")}</p>
              </div>
            )}
            {session.durationMinutes && (
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-medium">{session.durationMinutes} minutes</p>
              </div>
            )}
            {session.customerRating && (
              <div>
                <p className="text-gray-500">Customer Rating</p>
                <p className="font-medium">{"⭐".repeat(session.customerRating)} ({session.customerRating}/5)</p>
              </div>
            )}
          </div>

          {session.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-500 mb-1">Session Notes (visible to customer)</p>
              <p className="text-sm">{session.notes}</p>
            </div>
          )}
          {session.expertNotes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-500 mb-1">Expert Notes (internal)</p>
              <p className="text-sm text-indigo-800 italic">{session.expertNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete session form */}
      {session.status === "scheduled" && (
        <Card>
          <CardHeader><CardTitle>Mark Session as Completed</CardTitle></CardHeader>
          <CardContent>
            <CompleteSessionButton sessionId={session.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
