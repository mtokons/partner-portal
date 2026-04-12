import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

// Teachers are employees with role "teacher" — fetched from HR
import { fetchEmployees } from "../../hr/actions";

export default async function TeachersPage() {
  let teachers: Awaited<ReturnType<typeof fetchEmployees>> = [];
  try {
    const allEmployees = await fetchEmployees();
    teachers = allEmployees.filter((e) => e.department === "language-school" || e.role === "teacher");
  } catch {
    // Permission or data error
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teachers</h1>
        <p className="text-muted-foreground">{teachers.length} teachers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No teachers found. Add teachers from the HR module.</p>
            </CardContent>
          </Card>
        ) : (
          teachers.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.fullName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">{t.email}</p>
                  <p className="text-muted-foreground">{t.phone}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={t.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{t.status}</Badge>
                    <span className="text-xs text-muted-foreground capitalize">{t.department}</span>
                  </div>
                  {t.sccgId && <p className="text-xs text-muted-foreground font-mono mt-1">{t.sccgId}</p>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
