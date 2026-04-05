import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOffers } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Handshake, FileText, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft:    { label: "Draft",    variant: "secondary" },
  sent:     { label: "Sent",     variant: "outline" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default async function SalesOffersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  let offers = await getSalesOffers(user.role === "admin" ? undefined : user.partnerId);
  if (user.role === "partner") {
    offers = offers.filter((o) => o.createdBy === user.id);
  }

  const draft = offers.filter((o) => o.status === "draft").length;
  const sent = offers.filter((o) => o.status === "sent").length;
  const accepted = offers.filter((o) => o.status === "accepted").length;
  const rejected = offers.filter((o) => o.status === "rejected").length;

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-purple" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sales</p>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Sales Offers</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{offers.length} offers total</p>
        </div>
        <Link href="/sales/offers/new">
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            New Offer
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Draft", value: draft, icon: Clock, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
          { label: "Sent", value: sent, icon: Send, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
          { label: "Accepted", value: accepted, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Rejected", value: rejected, icon: XCircle, color: "text-red-500", bg: "bg-red-50 border-red-100" },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-center gap-3 px-4 py-4 rounded-2xl border ${stat.bg} card-hover`}>
            <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground leading-none">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Handshake className="h-4 w-4 text-primary" />
            All Offers
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-6">Offer #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total (BDT)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No sales offers yet. Create your first one!
                  </TableCell>
                </TableRow>
              )}
              {offers.map((offer) => {
                const cfg = statusConfig[offer.status] || statusConfig.draft;
                return (
                  <TableRow key={offer.id} className="group hover:bg-muted/20">
                    <TableCell className="pl-6 font-mono font-semibold text-primary">
                      <Link href={`/sales/offers/${offer.id}`} className="hover:underline">
                        {offer.offerNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{offer.clientName}</p>
                        <p className="text-xs text-muted-foreground">{offer.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">BDT {offer.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(offer.validUntil).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Link href={`/sales/offers/${offer.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
