"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBatch } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewBatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") || "";
  const courseName = searchParams.get("courseName") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await createBatch({
        courseId: form.get("courseId") as string,
        courseName: form.get("courseName") as string,
        batchCode: form.get("batchCode") as string,
        batchName: form.get("batchName") as string,
        teacherId: form.get("teacherId") as string,
        teacherName: form.get("teacherName") as string,
        startDate: form.get("startDate") as string,
        endDate: form.get("endDate") as string,
        schedule: form.get("schedule") as string,
        maxStudents: parseInt(form.get("maxStudents") as string),
        classroomOrLink: (form.get("classroomOrLink") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      router.push("/admin/school/batches");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create batch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Batch</h1>
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Batch Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courseId">Course ID *</Label>
              <Input id="courseId" name="courseId" required defaultValue={courseId} placeholder="Firestore course ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input id="courseName" name="courseName" required defaultValue={courseName} placeholder="German Language — A1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchCode">Batch Code *</Label>
              <Input id="batchCode" name="batchCode" required placeholder="GER-A1-2025-B1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchName">Batch Name *</Label>
              <Input id="batchName" name="batchName" required placeholder="German A1 — January 2025" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherId">Teacher ID *</Label>
              <Input id="teacherId" name="teacherId" required placeholder="Teacher user ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherName">Teacher Name *</Label>
              <Input id="teacherName" name="teacherName" required placeholder="Prof. Müller" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule *</Label>
              <Input id="schedule" name="schedule" required placeholder="Sun, Tue, Thu 7:00 PM — 8:30 PM" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students *</Label>
              <Input id="maxStudents" name="maxStudents" type="number" required min={1} placeholder="25" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classroomOrLink">Classroom / Meeting Link</Label>
              <Input id="classroomOrLink" name="classroomOrLink" placeholder="Room 204 or Zoom link" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Creating..." : "Create Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
