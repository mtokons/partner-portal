import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getSessionsByCustomer } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, Clock } from "lucide-react";

const statusColor: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  pending: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  rescheduled: "bg-yellow-100 text-yellow-800",
};

export default async function CustomerSessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");
  const user = session.user as SessionUser;

  const sessions = await getSessionsByCustomer(user.id);

  const completed = sessions.filter((s) => s.status === "completed");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const pending = sessions.filter((s) => s.status === "pending");

  const avgRating = completed.filter((s) => s.customerRating).reduce((acc, s, _, arr) => acc + (s.customerRating || 0) / arr.length, 0);

  const SessionTable = ({ rows }: { rows: typeof sessions }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Package</TableHead>
          <TableHead>Expert</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Rating</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">#{s.sessionNumber}</TableCell>
            <TableCell className="text-xs text-gray-500">{s.customerPackageId}</TableCell>
            <TableCell>{s.expertName || <span className="text-gray-400">Unassigned</span>}</TableCell>
            <TableCell><Badge className={statusColor[s.status] || ""}>{s.status}</Badge></TableCell>
            <TableCell className="text-sm">
              {s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-GB")
                : s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString("en-GB")
                : "—"}
            </TableCell>
            <TableCell>{s.durationMinutes ? `${s.durationMinutes} min` : "—"}</TableCell>
            <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{s.notes || "—"}</TableCell>
            <TableCell>
              {s.customerRating ? (
                <span className="text-yellow-500">{"★".repeat(s.customerRating)}{"☆".repeat(5 - s.customerRating)}</span>
              ) : "—"}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-gray-400 py-8">No sessions in this category</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-gray-500">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed.length}</div>
            {avgRating > 0 && <p className="text-xs text-gray-400">Avg rating: {avgRating.toFixed(1)} ★</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-gray-500">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcoming.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-gray-500">Pending</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card><CardContent className="pt-4"><SessionTable rows={sessions} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="upcoming">
          <Card><CardContent className="pt-4"><SessionTable rows={[...upcoming, ...pending]} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="completed">
          <Card><CardContent className="pt-4"><SessionTable rows={completed} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
