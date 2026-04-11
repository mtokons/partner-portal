import { NextResponse } from "next/server";
import { getSalesOfferById, getSalesOfferItems } from "@/lib/sharepoint";
import { generateSalesOfferPdf } from "@/lib/pdf";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing offer id" }, { status: 400 });
  }

  const offer = await getSalesOfferById(id);
  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const items = await getSalesOfferItems(id);

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

  const pdfBytes = generateSalesOfferPdf(
    offer.partnerName || "SCCG",
    offer.clientName || "Client",
    pdfItems,
    offer.validUntil,
    rate
  );

  const filename = `offer-${offer.offerNumber || offer.id}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
