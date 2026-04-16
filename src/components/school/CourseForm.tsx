"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse, updateCourse } from "@/app/(portal)/admin/school/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { SchoolCourse, CourseLanguage, CourseLevel } from "@/types";

interface CourseFormProps {
  initialData?: SchoolCourse;
  onSuccess?: () => void;
}

export function CourseForm({ initialData, onSuccess }: CourseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    
    const data = {
      courseName: form.get("courseName") as string,
      courseCode: form.get("courseCode") as string,
      language: form.get("language") as CourseLanguage,
      level: form.get("level") as CourseLevel,
      description: form.get("description") as string,
      totalSessions: parseInt(form.get("totalSessions") as string),
      sessionDurationMinutes: parseInt(form.get("sessionDuration") as string),
      totalDurationWeeks: parseInt(form.get("totalWeeks") as string),
      courseFee: parseFloat(form.get("courseFee") as string),
      courseFeeCurrency: "BDT" as const,
      maxStudentsPerBatch: parseInt(form.get("maxStudents") as string),
      prerequisites: (form.get("prerequisites") as string) || undefined,
    };

    try {
      if (isEdit && initialData) {
        await updateCourse(initialData.id, data);
      } else {
        await createCourse(data);
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/school/courses");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course");
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
          <Label htmlFor="courseName" className="font-bold">Course Name *</Label>
          <Input id="courseName" name="courseName" required defaultValue={initialData?.courseName} placeholder="German Language — A1" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="courseCode" className="font-bold">Course Code *</Label>
          <Input id="courseCode" name="courseCode" required defaultValue={initialData?.courseCode} placeholder="GER-A1" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language" className="font-bold">Language *</Label>
          <Select name="language" required defaultValue={initialData?.language}>
            <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="german">German</SelectItem>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="japanese">Japanese</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="level" className="font-bold">Level *</Label>
          <Select name="level" required defaultValue={initialData?.level}>
            <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="description" className="font-bold">Description *</Label>
          <Textarea id="description" name="description" required rows={3} defaultValue={initialData?.description} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalSessions" className="font-bold">Total Sessions *</Label>
          <Input id="totalSessions" name="totalSessions" type="number" required min={1} defaultValue={initialData?.totalSessions} placeholder="48" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionDuration" className="font-bold">Session Duration (min) *</Label>
          <Input id="sessionDuration" name="sessionDuration" type="number" required min={15} defaultValue={initialData?.sessionDurationMinutes} placeholder="90" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalWeeks" className="font-bold">Duration (weeks) *</Label>
          <Input id="totalWeeks" name="totalWeeks" type="number" required min={1} defaultValue={initialData?.totalDurationWeeks} placeholder="12" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="courseFee" className="font-bold">Course Fee (BDT) *</Label>
          <Input id="courseFee" name="courseFee" type="number" required min={0} defaultValue={initialData?.courseFee} placeholder="25000" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxStudents" className="font-bold">Max Students per Batch *</Label>
          <Input id="maxStudents" name="maxStudents" type="number" required min={1} defaultValue={initialData?.maxStudentsPerBatch} placeholder="25" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prerequisites" className="font-bold">Prerequisites</Label>
          <Input id="prerequisites" name="prerequisites" defaultValue={initialData?.prerequisites} placeholder="Completion of A1" className="rounded-xl h-12" />
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
            "Update Course"
          ) : (
            "Create Course"
          )}
        </Button>
      </div>
    </form>
  );
}
