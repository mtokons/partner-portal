import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOfferById, getSalesOfferItems, getProducts } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowLeft, Package, BookOpen, CheckCircle2, Tag, Euro, Receipt, Percent } from "lucide-react";
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

  const [offer, items, allProducts] = await Promise.all([
    getSalesOfferById(id),
    getSalesOfferItems(id),
    getProducts(),
  ]);

  if (!offer) notFound();
  if (user.role !== "admin" && offer.createdBy !== user.id) redirect("/sales/offers");

  const cfg = statusConfig[offer.status] || statusConfig.draft;
  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  const discountAmount =
    offer.discount > 0
      ? offer.discountType === "percent"
        ? offer.subtotal * (offer.discount / 100)
        : offer.discount
      : 0;

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

          {/* ── Offer Details — service cards ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Offer Details
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({items.length} service{items.length !== 1 ? "s" : ""})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {items.length === 0 ? (
                <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No services on this offer.
                </div>
              ) : (
                <div className="divide-y">
                  {items.map((item) => {
                    const product = productMap.get(item.productId);
                    const rawTags = product?.tags ?? [];
                    const includes = rawTags
                      .filter((t) => t.toLowerCase().startsWith("include:") || t.toLowerCase().startsWith("includes:"))
                      .map((t) => t.replace(/^includes?:/i, "").trim());
                    const badges = rawTags.filter(
                      (t) => !t.toLowerCase().startsWith("include:") && !t.toLowerCase().startsWith("includes:")
                    );
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
                          {product?.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                          )}
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

                        <div className="sm:text-right shrink-0 space-y-0.5 sm:min-w-[120px]">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 sm:justify-end">
                            <Euro className="w-3 h-3" /> Unit price
                          </p>
                          <p className="text-sm font-medium">€{item.unitPrice.toLocaleString()}</p>
                          <p className="text-base font-bold text-primary">€{item.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Offer Breakdown ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Offer Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                      <tr key={item.id}>
                        <td className="py-3 font-medium">{item.productName}</td>
                        <td className="py-3 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="py-3 text-right text-muted-foreground">€{item.unitPrice.toLocaleString()}</td>
                        <td className="py-3 text-right font-semibold">€{item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">€{offer.subtotal.toLocaleString()}</span>
                </div>
                {offer.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      Discount ({offer.discountType === "percent" ? `${offer.discount}%` : "fixed"})
                    </span>
                    <span className="font-medium">− €{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary">€{offer.totalAmount.toLocaleString()}</span>
                </div>
              </div>
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
                <span>€{offer.subtotal.toLocaleString()}</span>
              </div>
              {offer.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount ({offer.discountType === "percent" ? `${offer.discount}%` : "fixed"})</span>
                  <span>-€{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-primary">€{offer.totalAmount.toLocaleString()}</span>
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
