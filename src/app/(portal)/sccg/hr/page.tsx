import Link from "next/link";
import { BriefcaseBusiness, UserPlus, Users } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { getEmployees } from "@/lib/firestore-services";

export default async function SccgHrPage() {
  await requirePermission("hr.employee.view");
  const employees = await getEmployees();
  const active = employees.filter((employee) => employee.status === "active").length;
  const onboarding = employees.filter((employee) => ["onboarding", "probation"].includes(employee.status)).length;
  const departments = new Set(employees.map((employee) => employee.department)).size;

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Human Resources</h1><p className="text-sm text-muted-foreground">Employee lifecycle and onboarding</p></div><Link href="/sccg/hr/employees/new" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm"><UserPlus className="w-4 h-4" /> Add Employee</Link></div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[{ label: "Employees", value: employees.length, icon: Users }, { label: "Active", value: active, icon: BriefcaseBusiness }, { label: "Onboarding", value: onboarding, icon: UserPlus }].map(({ label, value, icon: Icon }) => <div key={label} className="border rounded-lg p-5 bg-card"><Icon className="w-5 h-5 text-primary mb-4" /><p className="text-3xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>)}
    </div>
    <div className="flex items-center justify-between border-t pt-5"><p className="text-sm text-muted-foreground">{departments} represented departments</p><Link href="/sccg/hr/employees" className="text-sm font-medium text-primary">View employee directory</Link></div>
  </div>;
}