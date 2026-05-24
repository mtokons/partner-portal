import { fetchEmployees } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default async function EmployeesListPage() {
  const employees = await fetchEmployees();

  const statusColor: Record<string, string> = {
    onboarding: "bg-amber-500/10 text-amber-700",
    probation: "bg-purple-500/10 text-purple-700",
    active: "bg-green-500/10 text-green-700",
    "on-leave": "bg-blue-500/10 text-blue-700",
    suspended: "bg-red-500/10 text-red-700",
    "notice-period": "bg-orange-500/10 text-orange-700",
    terminated: "bg-gray-500/10 text-gray-700",
    resigned: "bg-gray-500/10 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">{employees.length} total employees</p>
        </div>
        <Link
          href="/admin/hr/employees/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Full Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Designation</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joining Date</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">{emp.sccgId}</td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/hr/employees/${emp.id}`} className="text-primary hover:underline font-medium">
                        {emp.fullName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{emp.email}</td>
                    <td className="py-3 px-4">{emp.designation}</td>
                    <td className="py-3 px-4 capitalize">{emp.department}</td>
                    <td className="py-3 px-4 capitalize text-xs">{emp.employmentType}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[emp.status] || ""}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{emp.joiningDate}</td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No employees found. Add your first employee to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
