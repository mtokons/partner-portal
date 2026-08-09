import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { getEmployees } from "@/lib/firestore-services";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  await requirePermission("hr.employee.view");
  const filters = await searchParams;
  const employees = await getEmployees(filters);
  return <div className="space-y-5 max-w-7xl mx-auto">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Employees</h1><Link href="/sccg/hr/employees/new" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm"><UserPlus className="w-4 h-4" /> Add Employee</Link></div>
    <form className="flex gap-2"><input name="search" defaultValue={filters.search} placeholder="Search name, email or SCCG ID" className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" /><select name="status" defaultValue={filters.status || ""} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="onboarding">Onboarding</option><option value="probation">Probation</option><option value="suspended">Suspended</option></select><button className="rounded-md border px-4 text-sm">Filter</button></form>
    <div className="overflow-x-auto border rounded-lg"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Employee</th><th className="p-3">Department</th><th className="p-3">Designation</th><th className="p-3">Status</th><th className="p-3">Joined</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id} className="border-t"><td className="p-3"><Link href={`/sccg/hr/employees/${employee.id}`} className="font-medium text-primary">{employee.fullName}</Link><p className="text-xs text-muted-foreground">{employee.sccgId} · {employee.email}</p></td><td className="p-3 capitalize">{employee.department.replace("-", " ")}</td><td className="p-3">{employee.designation}</td><td className="p-3 capitalize">{employee.status.replace("-", " ")}</td><td className="p-3">{employee.joiningDate}</td></tr>)}</tbody></table>{employees.length === 0 && <p className="p-8 text-center text-muted-foreground">No employees found.</p>}</div>
  </div>;
}