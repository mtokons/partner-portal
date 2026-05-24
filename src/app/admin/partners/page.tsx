import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser, TierStatus } from "@/types";
import { getPartners } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/RowActions";
import { removePartner, holdPartner } from "@/lib/row-actions";
import { refreshPartnersAction } from "./actions";
import { RefreshCw, Award, Eye } from "lucide-react";
import Link from "next/link";
import PartnerStatusButtons from "./PartnerStatusButtons";
import PartnerTierEditModal from "./PartnerTierEditModal";
import SalesTargetModal from "./SalesTargetModal";

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
};

const tierStyles: Record<TierStatus, string> = {
  Silver: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  Gold: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Diamond: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  Platinum: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
};

export default async function AdminPartnersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const partners = await getPartners();
  // Show all partners regardless of role value (partner, partner-individual, etc.)
  const partnerAccounts = partners.filter((p) =>
    ["partner", "partner-individual", "partner-institutional"].includes(p.role?.toLowerCase() || "partner")
    || p.onboardingStatus === "approved"
    || p.status === "active"
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Partners</h1>
        <form action={async () => { "use server"; await refreshPartnersAction(); }}>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 shadow-sm transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </form>
      </div>

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
                <TableHead>Level / Tier</TableHead>
                <TableHead>Commission Share</TableHead>
                <TableHead>Sales Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerAccounts.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>{partner.company}</TableCell>
                  <TableCell className="text-sm">{partner.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-semibold ${tierStyles[partner.tierStatus || "Silver"]}`}>
                      👑 {partner.tierStatus || "Silver"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-gray-800">
                    {partner.marginPercentage || 15}%
                  </TableCell>
                  <TableCell>
                    <SalesTargetModal
                      partnerId={partner.id}
                      currentTarget={partner.salesTarget}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColor[partner.status] || ""}>{partner.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(partner.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PartnerStatusButtons partnerId={partner.id} currentStatus={partner.status} />
                      {partner.status === "active" && (
                        <PartnerTierEditModal
                          partnerId={partner.id}
                          currentTier={partner.tierStatus}
                          currentMargin={partner.marginPercentage}
                        />
                      )}
                      <Link
                        href={`/admin/partners/${partner.id}/finance`}
                        className="flex items-center gap-1 px-2.5 py-1 h-8 text-xs font-semibold rounded-xl border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="View Finance"
                      >
                        <Eye className="h-3.5 w-3.5" /> Finance
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      entityLabel="partner"
                      isOnHold={!!partner.isOnHold}
                      onHold={async () => { "use server"; return holdPartner(partner.id, !partner.isOnHold); }}
                      onDelete={async () => { "use server"; return removePartner(partner.id); }}
                      editHref={`/admin/partners/${partner.id}/edit`}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {partnerAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-400 py-8">
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
