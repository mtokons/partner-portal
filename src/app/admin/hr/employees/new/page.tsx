"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNewEmployee } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EmployeeDepartment, EmploymentType } from "@/types";

const departments: EmployeeDepartment[] = [
  "management", "technology", "finance", "hr", "sales", "marketing", "operations", "education", "support", "other",
];

const employmentTypes: EmploymentType[] = ["full-time", "part-time", "contract", "intern", "probation"];

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      await createNewEmployee({
        fullName: form.get("fullName") as string,
        email: form.get("email") as string,
        phone: form.get("phone") as string,
        designation: form.get("designation") as string,
        department: form.get("department") as EmployeeDepartment,
        employmentType: form.get("employmentType") as EmploymentType,
        joiningDate: form.get("joiningDate") as string,
        probationMonths: parseInt(form.get("probationMonths") as string) || 3,
        personalEmail: (form.get("personalEmail") as string) || undefined,
        dateOfBirth: (form.get("dateOfBirth") as string) || undefined,
        gender: (form.get("gender") as string as "male" | "female" | "other") || undefined,
        nationality: (form.get("nationality") as string) || undefined,
        address: (form.get("address") as string) || undefined,
        team: (form.get("team") as string) || undefined,
        reportsToName: (form.get("reportsToName") as string) || undefined,
      });
      router.push("/admin/hr/employees");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add New Employee</h1>
        <p className="text-muted-foreground">Onboard a new team member</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" name="fullName" required placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Office Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="john@sccg.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalEmail">Personal Email</Label>
              <Input id="personalEmail" name="personalEmail" type="email" placeholder="john@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" required placeholder="+880 1XXX-XXXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select name="gender">
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" name="nationality" placeholder="Bangladeshi" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" placeholder="Full address" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader><CardTitle>Employment Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation *</Label>
              <Input id="designation" name="designation" required placeholder="Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select name="department" required>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Input id="team" name="team" placeholder="Backend Team" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type *</Label>
              <Select name="employmentType" required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joiningDate">Joining Date *</Label>
              <Input id="joiningDate" name="joiningDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probationMonths">Probation (months)</Label>
              <Input id="probationMonths" name="probationMonths" type="number" defaultValue={3} min={0} max={12} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportsToName">Reports To</Label>
              <Input id="reportsToName" name="reportsToName" placeholder="Manager name" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
