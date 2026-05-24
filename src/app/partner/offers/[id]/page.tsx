import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOfferById, getSalesOfferItems, getPartnerByEmail } from "@/lib/sharepoint";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Download, Send, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import OfferActionButtons from "./OfferActionButtons";

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  draft: Clock,
  sent: Send,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: Clock,
};

export default async function PartnerOfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  if (!user.partnerId) redirect("/partner-pending");

  const [offer, items, partner] = await Promise.all([
    getSalesOfferById(id),
    getSalesOfferItems(id),
    getPartnerByEmail(user.email!),
  ]);

  if (!offer) notFound();
  if (offer.partnerId !== user.partnerId && user.role !== "admin") notFound();

  const StatusIcon = STATUS_ICONS[offer.status] || Clock;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/partner/offers" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Offer {offer.offerNumber}
            <StatusIcon className="w-5 h-5 text-muted-foreground" />
          </h1>
          <p className="text-muted-foreground text-sm">
            Created {offer.createdAt ? format(parseISO(offer.createdAt), "MMM d, yyyy") : "—"}
            {offer.validUntil && ` · Valid until ${format(parseISO(offer.validUntil), "MMM d, yyyy")}`}
          </p>
        </div>
        <OfferActionButtons offerId={id} status={offer.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="bg-card border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Client</h2>
          <p className="font-medium text-foreground">{offer.clientName}</p>
          <p className="text-sm text-muted-foreground">{offer.clientEmail}</p>
        </div>

        {/* Partner Info */}
        <div className="bg-card border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Partner</h2>
          <p className="font-medium text-foreground">{partner?.name || user.name}</p>
          <p className="text-sm text-muted-foreground">{partner?.company || user.company}</p>
        </div>

        {/* Status */}
        <div className="bg-card border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</h2>
          <p className="font-medium text-foreground capitalize">{offer.status}</p>
          <p className="text-sm text-muted-foreground">
            {offer.saleType === "partner-institutional" ? "Institutional Partner" : "Individual Partner"}
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h2 className="font-semibold text-foreground">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Price</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">{item.productName}</td>
                  <td className="px-6 py-4 text-center">{item.quantity}</td>
                  <td className="px-6 py-4 text-right">€{item.unitPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold">€{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-t bg-muted/20 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">€{offer.subtotal.toFixed(2)}</span>
          </div>
          {offer.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Discount ({offer.discountType === "percent" ? `${offer.discount}%` : "Fixed"})
              </span>
              <span className="text-red-500 font-medium">-€{(offer.discountType === "percent" ? (offer.subtotal * offer.discount / 100) : offer.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">€{offer.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {offer.notes && (
        <div className="bg-card border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h2>
          <p className="text-sm text-foreground whitespace-pre-wrap">{offer.notes}</p>
        </div>
      )}
    </div>
  );
}
