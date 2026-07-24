import { fetchEmployees } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function HRReportsPage() {
  const employees = await fetchEmployees();

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  const deptCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};

  employees.forEach((e) => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
    typeCounts[e.employmentType] = (typeCounts[e.employmentType] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Reports</h1>
        <p className="text-muted-foreground">Workforce analytics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <span className="text-sm capitalize">{status}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Department</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(deptCounts).map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <span className="text-sm capitalize">{dept}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Employment Type</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <span className="text-sm capitalize">{type}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{employees.length}</p>
              <p className="text-sm text-muted-foreground">Total Headcount</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{statusCounts["active"] || 0}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{Object.keys(deptCounts).length}</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{statusCounts["onboarding"] || 0}</p>
              <p className="text-sm text-muted-foreground">Onboarding Queue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
