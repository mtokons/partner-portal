import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOfferById, getSalesOfferItems, getPartnerByEmail, getProducts } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { dual } from "@/lib/formatCurrency";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Send, CheckCircle, XCircle, Clock, Package, BookOpen, CheckCircle2, Tag, Euro, Receipt, Percent } from "lucide-react";
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

  const [offer, items, partner, allProducts] = await Promise.all([
    getSalesOfferById(id),
    getSalesOfferItems(id),
    getPartnerByEmail(user.email!),
    getProducts(),
  ]);

  if (!offer) notFound();
  if (offer.partnerId !== user.partnerId && user.role !== "admin") notFound();

  const secCur = partner?.preferredCurrency || "BDT";
  const rate = secCur !== "EUR" ? await getEurToRate(secCur) : 1;
  const d = (v: number) => dual(v, secCur, rate);

  // Build product lookup map for enriched details
  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  const StatusIcon = STATUS_ICONS[offer.status] || Clock;

  const discountAmount =
    offer.discount > 0
      ? offer.discountType === "percent"
        ? offer.subtotal * (offer.discount / 100)
        : offer.discount
      : 0;

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

      {/* ── Offer Details — service cards ── */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">
            Offer Details
            <span className="ml-2 text-xs font-normal text-muted-foreground">({items.length} service{items.length !== 1 ? "s" : ""})</span>
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No services on this offer.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const product = productMap.get(item.productId);
              // Parse "include:" prefixed tags as included features
              const rawTags = product?.tags ?? [];
              const includes = rawTags
                .filter((t) => t.toLowerCase().startsWith("include:") || t.toLowerCase().startsWith("includes:"))
                .map((t) => t.replace(/^includes?:/i, "").trim());
              const badges = rawTags.filter(
                (t) => !t.toLowerCase().startsWith("include:") && !t.toLowerCase().startsWith("includes:")
              );
              // Auto-generate includes from product fields when no explicit tags
              const autoIncludes: string[] = [];
              if (includes.length === 0 && product) {
                if (product.sessionsCount > 0)
                  autoIncludes.push(`${product.sessionsCount} expert session${product.sessionsCount !== 1 ? "s" : ""}`);
                if (product.unit && product.unit !== "Package")
                  autoIncludes.push(`Delivered as ${product.unit.toLowerCase()}`);
              }
              const allIncludes = includes.length > 0 ? includes : autoIncludes;

              return (
                <div key={item.id} className="px-6 py-5 flex flex-col sm:flex-row gap-4">
                  {/* Left: service info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{item.productName}</p>
                        {product?.category && (
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1">
                            {product.category}
                          </span>
                        )}
                      </div>
                      {item.quantity > 1 && (
                        <span className="shrink-0 text-xs font-medium bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                          × {item.quantity}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {product?.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                    )}

                    {/* What's Included */}
                    {allIncludes.length > 0 && (
                      <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3" />
                          What&apos;s Included
                        </p>
                        <ul className="space-y-1">
                          {allIncludes.map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-sm text-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {badges.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: pricing */}
                  <div className="sm:text-right shrink-0 space-y-0.5 sm:min-w-[120px]">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 sm:justify-end">
                      <Euro className="w-3 h-3" /> Unit price
                    </p>
                    <p className="text-sm font-medium text-foreground">{d(item.unitPrice)}</p>
                    {item.quantity > 1 && (
                      <>
                        <p className="text-xs text-muted-foreground mt-1.5">Line total</p>
                        <p className="text-base font-bold text-primary">{d(item.totalPrice)}</p>
                      </>
                    )}
                    {item.quantity === 1 && (
                      <p className="text-base font-bold text-primary">{d(item.totalPrice)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Offer Breakdown ── */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Offer Breakdown</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          {/* Line items summary table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                  <th className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-3 font-medium">{item.productName}</td>
                    <td className="py-3 text-center text-muted-foreground">{item.quantity}</td>
                    <td className="py-3 text-right text-muted-foreground">{d(item.unitPrice)}</td>
                    <td className="py-3 text-right font-semibold">{d(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{d(offer.subtotal)}</span>
            </div>
            {offer.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Percent className="w-3.5 h-3.5" />
                  Discount ({offer.discountType === "percent" ? `${offer.discount}%` : "Fixed amount"})
                </span>
                <span className="font-medium text-red-500">− {d(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary text-lg">{d(offer.totalAmount)}</span>
            </div>
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
