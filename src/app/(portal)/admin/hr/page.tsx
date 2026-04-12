import { fetchEmployees } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, UserPlus, Clock } from "lucide-react";
import Link from "next/link";

export default async function HRDashboardPage() {
  const employees = await fetchEmployees();

  const totalEmployees = employees.length;
  const onboarding = employees.filter((e) => e.status === "onboarding").length;
  const probation = employees.filter((e) => e.status === "probation").length;
  const active = employees.filter((e) => e.status === "active").length;
  const onLeave = employees.filter((e) => e.status === "on-leave").length;

  const departmentCounts: Record<string, number> = {};
  employees.forEach((e) => {
    departmentCounts[e.department] = (departmentCounts[e.department] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR Dashboard</h1>
          <p className="text-muted-foreground">Human Resources Overview</p>
        </div>
        <Link
          href="/admin/hr/employees/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmployees}</p>
                <p className="text-xs text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onboarding}</p>
                <p className="text-xs text-muted-foreground">Onboarding</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{probation}</p>
                <p className="text-xs text-muted-foreground">Probation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onLeave}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(departmentCounts).map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm capitalize">{dept}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Employees
            <Link href="/admin/hr/employees" className="text-sm font-normal text-primary hover:underline">
              View All →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Designation</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Joining</th>
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 10).map((emp) => (
                  <tr key={emp.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-mono text-xs">{emp.sccgId}</td>
                    <td className="py-2 px-3">
                      <Link href={`/admin/hr/employees/${emp.id}`} className="text-primary hover:underline font-medium">
                        {emp.fullName}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{emp.designation}</td>
                    <td className="py-2 px-3 capitalize">{emp.department}</td>
                    <td className="py-2 px-3">
                      <Badge variant={emp.status === "active" ? "default" : "secondary"} className="capitalize text-xs">
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{emp.joiningDate}</td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No employees yet. Click &quot;Add Employee&quot; to get started.
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
