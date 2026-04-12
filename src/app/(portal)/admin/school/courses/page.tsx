import { fetchCourses } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CoursesPage() {
  const courses = await fetchCourses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">{courses.length} courses</p>
        </div>
        <Link href="/admin/school/courses/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Course
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Code</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Course Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Language</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Level</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sessions</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fee</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono text-xs">{c.courseCode}</td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/school/courses/${c.id}`} className="text-primary hover:underline font-medium">{c.courseName}</Link>
                  </td>
                  <td className="py-3 px-4 capitalize">{c.language}</td>
                  <td className="py-3 px-4">{c.level}</td>
                  <td className="py-3 px-4">{c.totalSessions}</td>
                  <td className="py-3 px-4">৳{c.courseFee.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <Badge variant={c.status === "published" ? "default" : "secondary"} className="capitalize text-xs">{c.status}</Badge>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No courses yet. Create your first course.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
