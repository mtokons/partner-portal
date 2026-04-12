import { fetchCertificates } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Award } from "lucide-react";

export default async function CertificatesPage() {
  const certs = await fetchCertificates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Certificates</h1>
          <p className="text-muted-foreground">{certs.length} certificates issued</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{certs.length}</p>
            <p className="text-xs text-muted-foreground">Total Issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{certs.filter((c) => c.status === "issued").length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{certs.filter((c) => c.certificateType === "completion").length}</p>
            <p className="text-xs text-muted-foreground">Completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{certs.filter((c) => c.certificateType === "participation").length}</p>
            <p className="text-xs text-muted-foreground">Participation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Certificate #</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Course</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Grade</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Issued</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {certs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No certificates issued yet
                </td></tr>
              ) : (
                certs.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <Link href={`/admin/school/certificates/${c.id}`} className="text-primary hover:underline font-mono text-xs">{c.certificateNumber}</Link>
                    </td>
                    <td className="py-3 px-4 font-medium">{c.studentName}</td>
                    <td className="py-3 px-4">{c.courseName} ({c.courseLevel})</td>
                    <td className="py-3 px-4 capitalize">{c.certificateType}</td>
                    <td className="py-3 px-4 font-bold">{c.finalGrade || "—"}</td>
                    <td className="py-3 px-4 text-xs">{c.issuedDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant={c.status === "issued" ? "default" : "destructive"} className="capitalize text-xs">{c.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
