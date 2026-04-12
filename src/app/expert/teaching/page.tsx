import { fetchTeacherBatches } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpen, Users, Calendar } from "lucide-react";

export default async function TeachingDashboardPage() {
  const batches = await fetchTeacherBatches();

  const activeBatches = batches.filter((b) => b.status === "active");
  const totalStudents = batches.reduce((sum, b) => sum + b.enrolledStudents, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Teaching</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{batches.length}</p>
            <p className="text-xs text-muted-foreground">Total Batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Calendar className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{activeBatches.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="h-5 w-5 mx-auto text-violet-500 mb-1" />
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>My Batches</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Batch</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Course</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Schedule</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Students</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Period</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No batches assigned yet</td></tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <Link href={`/expert/teaching/batches/${b.id}`} className="text-primary hover:underline font-medium">{b.batchName}</Link>
                      <p className="text-xs font-mono text-muted-foreground">{b.batchCode}</p>
                    </td>
                    <td className="py-3 px-4">{b.courseName}</td>
                    <td className="py-3 px-4 text-xs">{b.schedule}</td>
                    <td className="py-3 px-4">{b.enrolledStudents}/{b.maxStudents}</td>
                    <td className="py-3 px-4 text-xs">{b.startDate} → {b.endDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant={b.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{b.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
