import { NextResponse } from "next/server";
import { getSalesOfferById, getSalesOfferItems } from "@/lib/sharepoint";
import { generateSalesOfferPdf } from "@/lib/pdf";
import { requireSessionUser, canAccess } from "@/lib/api-auth";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing offer id" }, { status: 400 });
  }

  let offer;
  try {
    offer = await getSalesOfferById(id);
  } catch (e) {
    console.error("offer-pdf: lookup failed", (e as Error).message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  // Ownership: partners see own; admin/finance see all; clients see by clientId
  if (!canAccess(user, { partnerId: offer.partnerId, customerId: offer.clientId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let items;
  try {
    items = await getSalesOfferItems(id);
  } catch (e) {
    console.error("offer-pdf: items lookup failed", (e as Error).message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }

  let rate: number | undefined;
  try {
    const { loadRate } = await import("@/lib/serverCurrency");
    rate = (await loadRate()) ?? undefined;
  } catch {
    // rate stays undefined — BDT-only PDF
  }

  const pdfItems = items.map((i) => ({
    name: i.productName,
    quantity: i.quantity,
    price: i.unitPrice,
  }));

  // Use authoritative offer totals — never recompute from line items, which
  // would silently ignore offer-level discounts and promo applications.
  const pdfBytes = generateSalesOfferPdf(
    offer.partnerName || "SCCG",
    offer.clientName || "Client",
    pdfItems,
    offer.validUntil,
    rate,
    {
      subtotal: offer.subtotal,
      discount: offer.discount,
      discountType: offer.discountType,
      totalAmount: offer.totalAmount,
    },
  );

  const filename = `offer-${offer.offerNumber || offer.id}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
