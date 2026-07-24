import { fetchEmployeeById, fetchOnboardingTasks, fetchEmployeeDocuments } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, FileText, User } from "lucide-react";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await fetchEmployeeById(id);
  if (!employee) notFound();

  const tasks = await fetchOnboardingTasks(id);
  const documents = await fetchEmployeeDocuments(id);

  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const totalTasks = tasks.length;

  const statusColor: Record<string, string> = {
    onboarding: "bg-amber-500 text-white",
    probation: "bg-purple-500 text-white",
    active: "bg-green-500 text-white",
    "on-leave": "bg-blue-500 text-white",
    suspended: "bg-red-500 text-white",
    "notice-period": "bg-orange-500 text-white",
    terminated: "bg-gray-500 text-white",
    resigned: "bg-gray-400 text-white",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/hr/employees" className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{employee.fullName}</h1>
          <p className="text-muted-foreground font-mono text-sm">{employee.sccgId}</p>
        </div>
        <Badge className={`${statusColor[employee.status] || ""} capitalize`}>{employee.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Employee Profile</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div><span className="text-muted-foreground">Full Name</span><p className="font-medium">{employee.fullName}</p></div>
              <div><span className="text-muted-foreground">Email</span><p className="font-medium">{employee.email}</p></div>
              <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{employee.phone}</p></div>
              <div><span className="text-muted-foreground">Designation</span><p className="font-medium">{employee.designation}</p></div>
              <div><span className="text-muted-foreground">Department</span><p className="font-medium capitalize">{employee.department}</p></div>
              <div><span className="text-muted-foreground">Employment Type</span><p className="font-medium capitalize">{employee.employmentType}</p></div>
              <div><span className="text-muted-foreground">Joining Date</span><p className="font-medium">{employee.joiningDate}</p></div>
              <div><span className="text-muted-foreground">Probation</span><p className="font-medium">{employee.probationMonths} months</p></div>
              {employee.reportsToName && (
                <div><span className="text-muted-foreground">Reports To</span><p className="font-medium">{employee.reportsToName}</p></div>
              )}
              {employee.team && (
                <div><span className="text-muted-foreground">Team</span><p className="font-medium">{employee.team}</p></div>
              )}
              {employee.confirmationDate && (
                <div><span className="text-muted-foreground">Confirmation Date</span><p className="font-medium">{employee.confirmationDate}</p></div>
              )}
              {employee.nationality && (
                <div><span className="text-muted-foreground">Nationality</span><p className="font-medium">{employee.nationality}</p></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Onboarding Progress
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {completedTasks}/{totalTasks}
              </span>
            </CardTitle>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : "0%" }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-1">
                {task.isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={`text-sm ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                  {task.taskName}
                </span>
                {task.isRequired && !task.isCompleted && (
                  <Badge variant="outline" className="text-[10px] ml-auto">Required</Badge>
                )}
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">No onboarding tasks</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <FileText className="h-8 w-8 text-muted-foreground/50 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.documentType.replace(/-/g, " ")}</p>
                  </div>
                  {doc.isConfidential && <Badge variant="destructive" className="text-[10px]">Confidential</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
