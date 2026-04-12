import { fetchCourseById, fetchBatches } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Users, BookOpen, DollarSign } from "lucide-react";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await fetchCourseById(id);
  if (!course) return notFound();

  const batches = await fetchBatches({ courseId: id });

  const statusColor =
    course.status === "published" ? "default" : course.status === "archived" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/school/courses" className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course.courseName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{course.courseCode}</p>
        </div>
        <Badge variant={statusColor} className="capitalize">{course.status}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BookOpen className="h-3.5 w-3.5" /> Language / Level
            </div>
            <p className="font-semibold capitalize">{course.language} — {course.level}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" /> Duration
            </div>
            <p className="font-semibold">{course.totalSessions} sessions / {course.totalDurationWeeks} weeks</p>
            <p className="text-xs text-muted-foreground">{course.sessionDurationMinutes} min each</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Max Students
            </div>
            <p className="font-semibold">{course.maxStudentsPerBatch} per batch</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Course Fee
            </div>
            <p className="font-semibold">৳{course.courseFee.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.description}</p>
          {course.prerequisites && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Prerequisites</p>
              <p className="text-sm font-medium">{course.prerequisites}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Batches ({batches.length})</CardTitle>
          <Link href={`/admin/school/batches/new?courseId=${id}&courseName=${encodeURIComponent(course.courseName)}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            + New Batch
          </Link>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No batches yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground">Code</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground">Name</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground">Teacher</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground">Start</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground">Students</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">{b.batchCode}</td>
                    <td className="py-2 px-3">
                      <Link href={`/admin/school/batches/${b.id}`} className="text-primary hover:underline">{b.batchName}</Link>
                    </td>
                    <td className="py-2 px-3">{b.teacherName}</td>
                    <td className="py-2 px-3">{b.startDate}</td>
                    <td className="py-2 px-3">{b.enrolledStudents}/{b.maxStudents}</td>
                    <td className="py-2 px-3">
                      <Badge variant={b.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{b.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
