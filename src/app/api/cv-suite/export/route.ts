import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { getCandidateById, getCandidateServices, getCandidates } from "@/lib/sharepoint";
import { calculateFinancialSplit } from "@/lib/engine/financial-split";
import {
  generateCandidateCvPdf,
  generateCandidateDossierPdf,
  generateMergedCandidatesPdf,
} from "@/lib/engine/cv-suite-pdf";
import {
  generateCandidateOfferPdf,
  generateCandidateInvoicePdf,
} from "@/lib/engine/candidate-pdf";
import { getPartnerByEmail } from "@/lib/sharepoint";
import type { PartnerMargin } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roles = ((user.roles || [user.role]) as string[]);
    const isAdmin = roles.includes("admin");
    const userPartnerId = (user as { partnerId?: string }).partnerId;

    const { searchParams } = new URL(request.url);
    const content = searchParams.get("content") ?? "cv";
    const format = searchParams.get("format") ?? "pdf-individual";
    const ids = searchParams.getAll("id");

    // ── Resolve candidates ────────────────────────────────────
    let candidateIds: string[];
    if (ids.length > 0) {
      candidateIds = ids;
    } else {
      const all = await getCandidates();
      candidateIds = all.map((c) => c.id);
    }

    if (candidateIds.length === 0) {
      return NextResponse.json({ error: "No candidates specified" }, { status: 400 });
    }

    // ── Load candidate data ───────────────────────────────────
    const candidatesData = await Promise.all(
      candidateIds.map(async (id) => {
        const candidate = await getCandidateById(id);
        if (!candidate) return null;

        // Partner permission check
        if (!isAdmin && userPartnerId && candidate.partnerId !== userPartnerId) {
          return null;
        }

        const services = await getCandidateServices(id);
        const split = calculateFinancialSplit({
          services: services.map((s) => ({
            servicePricingId: s.servicePricingId,
            serviceName: s.serviceName,
            basePrice: s.basePrice,
            quantity: s.quantity,
          })),
          partnerMarginPercentage: (candidate.marginPercentage || 20) as PartnerMargin,
        });
        return { candidate, services, split };
      })
    );

    const validData = candidatesData.filter(
      (d): d is NonNullable<typeof d> => d !== null
    );

    if (validData.length === 0) {
      return NextResponse.json({ error: "No valid candidates found or access forbidden" }, { status: 404 });
    }

    // ── Generate output ───────────────────────────────────────
    let pdfBytes: Uint8Array;
    let filename: string;

    if (format === "pdf-merged" || validData.length > 1) {
      const mergedContent = content === "dossier" ? "dossier" : "cv";
      pdfBytes = generateMergedCandidatesPdf(validData, mergedContent as "cv" | "dossier");
      filename = `candidates-${mergedContent}-${Date.now()}.pdf`;
    } else {
      const { candidate, services, split } = validData[0];

      switch (content) {
        case "offer": {
          const partner = await getPartnerByEmail(user.email ?? "");
          pdfBytes = generateCandidateOfferPdf(
            candidate,
            partner ?? ({ id: "", email: user.email ?? "", name: user.name ?? "" } as Parameters<typeof generateCandidateOfferPdf>[1]),
            services,
            split
          );
          filename = `offer-${candidate.sccgId || candidate.id}.pdf`;
          break;
        }
        case "invoice": {
          const invoiceNumber = `INV-${candidate.sccgId || candidate.id}-${Date.now()}`;
          pdfBytes = generateCandidateInvoicePdf(candidate, services, split, invoiceNumber);
          filename = `invoice-${candidate.sccgId || candidate.id}.pdf`;
          break;
        }
        case "dossier": {
          pdfBytes = generateCandidateDossierPdf(candidate, services, split);
          filename = `dossier-${candidate.sccgId || candidate.id}.pdf`;
          break;
        }
        case "profile":
        case "cv":
        default: {
          pdfBytes = generateCandidateCvPdf(candidate, services);
          filename = `cv-${candidate.sccgId || candidate.id}.pdf`;
          break;
        }
      }
    }

    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("PDF Export Route Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
