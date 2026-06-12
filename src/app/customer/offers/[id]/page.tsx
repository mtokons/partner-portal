import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyOfferDetail } from "@/app/customer/candidate-actions";
import { getProducts } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, DollarSign, CheckCircle2 } from "lucide-react";

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function CustomerOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");

  const { id } = await params;
  const result = await getMyOfferDetail(id);

  if (!result) {
    return (
      <div className="space-y-6">
        <Link href="/customer/offers" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Offers
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Offer not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { offer, items } = result;

  // Fetch products to show "What's Included" details
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts();
  } catch {
    // Products lookup is non-blocking
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customer/offers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{offer.offerNumber}</h1>
            <Badge className={statusColor[offer.status] || "bg-gray-100 text-gray-800"}>
              {offer.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            From {offer.partnerName || "Partner"} &middot; Valid until {new Date(offer.validUntil).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>

      {/* Offer Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Offer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="text-lg font-bold">€{offer.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Discount</p>
              <p className="text-lg font-bold text-green-600">
                {offer.discountType === "percent" ? `${offer.discount}%` : `€${offer.discount.toFixed(2)}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Amount</p>
              <p className="text-lg font-bold text-blue-600">€{offer.totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <Badge className={`${statusColor[offer.status]} mt-1`}>{offer.status}</Badge>
            </div>
          </div>

          {offer.notes && (
            <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{offer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services with What's Included */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Services & What&apos;s Included</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => {
            const product = productMap.get(item.productId);
            const rawTags = product?.tags ?? [];
            const includes = rawTags
              .filter((t) => t.toLowerCase().startsWith("include:") || t.toLowerCase().startsWith("includes:"))
              .map((t) => t.replace(/^includes?:/i, "").trim());
            // Auto-generate includes from product fields when no explicit tags
            const autoIncludes: string[] = [];
            if (includes.length === 0 && product) {
              if (product.sessionsCount > 0)
                autoIncludes.push(`${product.sessionsCount} expert session${product.sessionsCount !== 1 ? "s" : ""}`);
              if (product.description)
                autoIncludes.push(product.description);
            }
            const allIncludes = includes.length > 0 ? includes : autoIncludes;

            return (
              <div key={item.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{item.productName}</p>
                    {product?.category && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    <p className="font-bold text-primary">€{item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
                {allIncludes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What&apos;s Included</p>
                    <ul className="space-y-1">
                      {allIncludes.map((inc, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Contact Partner CTA */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-purple-900 text-sm">Have questions about this offer?</p>
            <p className="text-xs text-purple-700">Send a message to your partner directly</p>
          </div>
          <Link
            href="/customer/messages"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Send Message
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
