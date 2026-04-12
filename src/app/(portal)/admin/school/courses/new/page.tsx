"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await createCourse({
        courseName: form.get("courseName") as string,
        courseCode: form.get("courseCode") as string,
        language: form.get("language") as "german" | "english" | "japanese" | "other",
        level: form.get("level") as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
        description: form.get("description") as string,
        totalSessions: parseInt(form.get("totalSessions") as string),
        sessionDurationMinutes: parseInt(form.get("sessionDuration") as string),
        totalDurationWeeks: parseInt(form.get("totalWeeks") as string),
        courseFee: parseFloat(form.get("courseFee") as string),
        courseFeeCurrency: "BDT",
        maxStudentsPerBatch: parseInt(form.get("maxStudents") as string),
        prerequisites: (form.get("prerequisites") as string) || undefined,
      });
      router.push("/admin/school/courses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Course</h1>
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input id="courseName" name="courseName" required placeholder="German Language — A1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code *</Label>
              <Input id="courseCode" name="courseCode" required placeholder="GER-A1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select name="language" required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="german">German</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Select name="level" required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" required rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSessions">Total Sessions *</Label>
              <Input id="totalSessions" name="totalSessions" type="number" required min={1} placeholder="48" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionDuration">Session Duration (min) *</Label>
              <Input id="sessionDuration" name="sessionDuration" type="number" required min={15} placeholder="90" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalWeeks">Duration (weeks) *</Label>
              <Input id="totalWeeks" name="totalWeeks" type="number" required min={1} placeholder="12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseFee">Course Fee (BDT) *</Label>
              <Input id="courseFee" name="courseFee" type="number" required min={0} placeholder="25000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students per Batch *</Label>
              <Input id="maxStudents" name="maxStudents" type="number" required min={1} placeholder="25" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prerequisites">Prerequisites</Label>
              <Input id="prerequisites" name="prerequisites" placeholder="Completion of A1" />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Creating..." : "Create Course"}
          </button>
        </div>
      </form>
    </div>
  );
}
