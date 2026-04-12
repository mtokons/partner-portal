"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { enrollStudent } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewEnrollmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId") || "";
  const batchCode = searchParams.get("batchCode") || "";
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
      await enrollStudent({
        studentUserId: form.get("studentUserId") as string,
        studentName: form.get("studentName") as string,
        studentEmail: form.get("studentEmail") as string,
        studentPhone: (form.get("studentPhone") as string) || undefined,
        batchId: form.get("batchId") as string,
        batchCode: form.get("batchCode") as string,
        courseId: form.get("courseId") as string,
        courseName: form.get("courseName") as string,
        totalFee: parseFloat(form.get("totalFee") as string),
        discountAmount: parseFloat(form.get("discountAmount") as string) || undefined,
        discountReason: (form.get("discountReason") as string) || undefined,
      });
      router.push("/admin/school/enrollments");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Enroll Student</h1>
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Student Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentUserId">Student User ID *</Label>
              <Input id="studentUserId" name="studentUserId" required placeholder="Firebase UID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentName">Student Name *</Label>
              <Input id="studentName" name="studentName" required placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentEmail">Student Email *</Label>
              <Input id="studentEmail" name="studentEmail" type="email" required placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentPhone">Phone</Label>
              <Input id="studentPhone" name="studentPhone" placeholder="+880..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Batch &amp; Course</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchId">Batch ID *</Label>
              <Input id="batchId" name="batchId" required defaultValue={batchId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchCode">Batch Code *</Label>
              <Input id="batchCode" name="batchCode" required defaultValue={batchCode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseId">Course ID *</Label>
              <Input id="courseId" name="courseId" required defaultValue={courseId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input id="courseName" name="courseName" required defaultValue={courseName} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fee &amp; Discount</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalFee">Total Fee (BDT) *</Label>
              <Input id="totalFee" name="totalFee" type="number" required min={0} placeholder="25000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountAmount">Discount Amount</Label>
              <Input id="discountAmount" name="discountAmount" type="number" min={0} placeholder="0" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="discountReason">Discount Reason</Label>
              <Input id="discountReason" name="discountReason" placeholder="Early bird / referral / etc." />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Enrolling..." : "Enroll Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
