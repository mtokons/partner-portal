import { fetchBatches } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function BatchesPage() {
  const batches = await fetchBatches();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-muted-foreground">{batches.length} batches</p>
        </div>
        <Link href="/admin/school/batches/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Batch
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Code</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Batch Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Course</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Teacher</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Schedule</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Start</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Students</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No batches created yet</td></tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs">{b.batchCode}</td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/school/batches/${b.id}`} className="text-primary hover:underline font-medium">{b.batchName}</Link>
                    </td>
                    <td className="py-3 px-4">{b.courseName}</td>
                    <td className="py-3 px-4">{b.teacherName}</td>
                    <td className="py-3 px-4 text-xs">{b.schedule}</td>
                    <td className="py-3 px-4">{b.startDate}</td>
                    <td className="py-3 px-4">{b.enrolledStudents}/{b.maxStudents}</td>
                    <td className="py-3 px-4">
                      <Badge variant={b.status === "active" ? "default" : b.status === "completed" ? "outline" : "secondary"} className="capitalize text-xs">{b.status}</Badge>
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
