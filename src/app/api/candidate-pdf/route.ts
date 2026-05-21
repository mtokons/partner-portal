import { NextResponse } from "next/server";
import { getCandidateById, getCandidateServices, getPartnerByEmail } from "@/lib/sharepoint";
import { generateCandidateOfferPdf, generateCandidateInvoicePdf } from "@/lib/engine/candidate-pdf";
import { calculateFinancialSplit } from "@/lib/engine/financial-split";
import { requireSessionUser } from "@/lib/api-auth";
import type { PartnerMargin } from "@/types";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");
  const type = searchParams.get("type");

  if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
  if (type !== "offer" && type !== "invoice") {
    return NextResponse.json({ error: "type must be 'offer' or 'invoice'" }, { status: 400 });
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const roles = ((user.roles || [user.role]) as string[]);
  const isAdmin = roles.includes("admin");
  if (!isAdmin && (user as { partnerId?: string }).partnerId !== candidate.partnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const services = await getCandidateServices(candidateId);

  const split = calculateFinancialSplit({
    services: services.map((s) => ({
      servicePricingId: s.servicePricingId,
      serviceName: s.serviceName,
      basePrice: s.basePrice,
      quantity: s.quantity,
    })),
    partnerMarginPercentage: candidate.marginPercentage as PartnerMargin,
  });

  let pdfBytes: Uint8Array;
  let filename: string;

  if (type === "offer") {
    const partner = await getPartnerByEmail(user.email ?? "");
    pdfBytes = generateCandidateOfferPdf(
      candidate,
      partner ?? { id: "", email: user.email ?? "", name: user.name ?? "" } as Parameters<typeof generateCandidateOfferPdf>[1],
      services,
      split
    );
    filename = `offer-${candidate.sccgId}.pdf`;
  } else {
    const invoiceNumber = `INV-${candidate.sccgId}-${Date.now()}`;
    pdfBytes = generateCandidateInvoicePdf(candidate, services, split, invoiceNumber);
    filename = `invoice-${candidate.sccgId}.pdf`;
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
