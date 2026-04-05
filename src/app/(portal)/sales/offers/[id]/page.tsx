import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOfferById, getSalesOfferItems } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import OfferActions from "./OfferActions";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft:    { label: "Draft",    variant: "secondary" },
  sent:     { label: "Sent",     variant: "outline" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const { id } = await params;

  const [offer, items] = await Promise.all([
    getSalesOfferById(id),
    getSalesOfferItems(id),
  ]);

  if (!offer) notFound();
  if (user.role !== "admin" && offer.createdBy !== user.id) redirect("/sales/offers");

  const cfg = statusConfig[offer.status] || statusConfig.draft;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sales/offers">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-foreground">{offer.offerNumber}</h1>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {new Date(offer.createdAt).toLocaleDateString()} by {offer.partnerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(offer.status === "draft" || offer.status === "sent") && (
            <Link href={`/sales/offers/${offer.id}/edit`}>
              <Button variant="outline" size="sm">Edit Offer</Button>
            </Link>
          )}
          <OfferActions offer={offer} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client info */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Client</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{offer.clientName}</p>
              <p className="text-sm text-muted-foreground">{offer.clientEmail}</p>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Line Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right pr-6">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">BDT {item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6 font-semibold">BDT {item.totalPrice.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {offer.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>BDT {offer.subtotal.toLocaleString()}</span>
              </div>
              {offer.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount ({offer.discountType === "percent" ? `${offer.discount}%` : "fixed"})</span>
                  <span>-BDT {(offer.subtotal - offer.totalAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-primary">BDT {offer.totalAmount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(offer.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until</span>
                <span>{new Date(offer.validUntil).toLocaleDateString()}</span>
              </div>
              {offer.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{new Date(offer.sentAt).toLocaleDateString()}</span>
                </div>
              )}
              {offer.acceptedAt && (
                <div className="flex justify-between text-emerald-600">
                  <span>Accepted</span>
                  <span>{new Date(offer.acceptedAt).toLocaleDateString()}</span>
                </div>
              )}
              {offer.rejectedAt && (
                <div className="flex justify-between text-red-500">
                  <span>Rejected</span>
                  <span>{new Date(offer.rejectedAt).toLocaleDateString()}</span>
                </div>
              )}
              {offer.salesOrderId && (
                <div className="border-t pt-2 mt-2">
                  <Link href={`/sales/orders/${offer.salesOrderId}`} className="text-primary hover:underline font-medium">
                    View Sales Order →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
