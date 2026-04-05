import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getPartners } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PartnerStatusButtons from "./PartnerStatusButtons";

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
};

export default async function AdminPartnersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const partners = await getPartners();
  const partnerAccounts = partners.filter((p) => p.role === "partner");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Manage Partners</h1>

      <div className="grid grid-cols-3 gap-4 text-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{partnerAccounts.filter((p) => p.status === "active").length}</div>
            <div className="text-sm text-gray-500 mt-1">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-600">{partnerAccounts.filter((p) => p.status === "pending").length}</div>
            <div className="text-sm text-gray-500 mt-1">Pending Approval</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-600">{partnerAccounts.filter((p) => p.status === "suspended").length}</div>
            <div className="text-sm text-gray-500 mt-1">Suspended</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Partners ({partnerAccounts.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerAccounts.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>{partner.company}</TableCell>
                  <TableCell className="text-sm">{partner.email}</TableCell>
                  <TableCell className="text-sm text-gray-500">{partner.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[partner.status] || ""}>{partner.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(partner.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <PartnerStatusButtons partnerId={partner.id} currentStatus={partner.status} />
                  </TableCell>
                </TableRow>
              ))}
              {partnerAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                    No partners yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
