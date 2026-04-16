"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBatch, updateBatch } from "@/app/(portal)/admin/school/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, BookOpen, User } from "lucide-react";
import type { SchoolBatch, SchoolCourse, SchoolTeacher } from "@/types";

interface BatchFormProps {
  initialData?: SchoolBatch;
  courses: SchoolCourse[];
  teachers: SchoolTeacher[];
  onSuccess?: () => void;
}

export function BatchForm({ initialData, courses, teachers, onSuccess }: BatchFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    
    const courseId = form.get("courseId") as string;
    const teacherId = form.get("teacherId") as string;
    
    const selectedCourse = courses.find(c => c.id === courseId);
    const selectedTeacher = teachers.find(t => t.id === teacherId);

    if (!selectedCourse) {
      setError("Please select a valid course");
      setLoading(false);
      return;
    }
    
    if (!selectedTeacher) {
      setError("Please select a valid teacher");
      setLoading(false);
      return;
    }

    const data = {
      courseId,
      courseName: selectedCourse.courseName,
      batchCode: form.get("batchCode") as string,
      batchName: form.get("batchName") as string,
      teacherId,
      teacherName: selectedTeacher.name,
      startDate: form.get("startDate") as string,
      endDate: form.get("endDate") as string,
      schedule: form.get("schedule") as string,
      maxStudents: parseInt(form.get("maxStudents") as string),
      classroomOrLink: (form.get("classroomOrLink") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    };

    try {
      if (isEdit && initialData) {
        await updateBatch(initialData.id, data);
      } else {
        await createBatch(data);
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/school/batches");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save batch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20 font-medium">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="courseId" className="font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Select Course *
          </Label>
          <Select name="courseId" required defaultValue={initialData?.courseId}>
            <SelectTrigger className="rounded-xl h-12 shadow-sm border-gray-200">
              <SelectValue placeholder="Chose a course..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.courseName} ({c.level})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacherId" className="font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Assign Teacher *
          </Label>
          <Select name="teacherId" required defaultValue={initialData?.teacherId}>
            <SelectTrigger className="rounded-xl h-12 shadow-sm border-gray-200">
              <SelectValue placeholder="Assign a teacher..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {teachers.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batchCode" className="font-bold">Batch Code *</Label>
          <Input id="batchCode" name="batchCode" required defaultValue={initialData?.batchCode} placeholder="GER-A1-2025-01" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batchName" className="font-bold">Batch Name *</Label>
          <Input id="batchName" name="batchName" required defaultValue={initialData?.batchName} placeholder="January Morning Batch" className="rounded-xl h-12" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate" className="font-bold">Start Date *</Label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input id="startDate" name="startDate" type="date" required defaultValue={initialData?.startDate} className="rounded-xl h-12 pl-12" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate" className="font-bold">End Date *</Label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input id="endDate" name="endDate" type="date" required defaultValue={initialData?.endDate} className="rounded-xl h-12 pl-12" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule" className="font-bold">Schedule *</Label>
          <Input id="schedule" name="schedule" required defaultValue={initialData?.schedule} placeholder="Mon, Wed, Fri (10:00 - 12:00)" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxStudents" className="font-bold">Max Students *</Label>
          <Input id="maxStudents" name="maxStudents" type="number" required min={1} defaultValue={initialData?.maxStudents} placeholder="25" className="rounded-xl h-12" />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="classroomOrLink" className="font-bold">Classroom / Meeting Link</Label>
          <Input id="classroomOrLink" name="classroomOrLink" defaultValue={initialData?.classroomOrLink} placeholder="Room 201 or Zoom/Meet URL" className="rounded-xl h-12" />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="notes" className="font-bold">Additional Notes</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={initialData?.notes} className="rounded-xl" />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button 
          type="submit" 
          disabled={loading} 
          className="rounded-[18px] h-12 px-8 font-black text-base shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isEdit ? (
            "Update Batch"
          ) : (
            "Create Batch"
          )}
        </Button>
      </div>
    </form>
  );
}
