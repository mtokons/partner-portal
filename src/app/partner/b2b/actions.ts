"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import type { SessionUser } from "@/types";
import {
  getPartnerByEmail,
  createB2BCompany,
  getB2BCompanies,
  updateB2BCompanyStatus,
  updateB2BCertificate,
  getB2BCompanyByCertCode,
} from "@/lib/sharepoint";

export async function getMyB2BCompaniesAction() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return { success: false as const, error: "Partner not found" };

  const companies = await getB2BCompanies(partner.id);
  return { success: true as const, data: companies, partner };
}

export async function getAllB2BCompaniesAction() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const companies = await getB2BCompanies();
  return { success: true as const, data: companies };
}

export async function addB2BCompanyAction(formData: FormData) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return { success: false as const, error: "Partner not found" };

  const companyName   = (formData.get("companyName") as string || "").trim();
  const contactPerson = (formData.get("contactPerson") as string || "").trim();
  const contactNumber = (formData.get("contactNumber") as string || "").trim();
  const email         = (formData.get("email") as string || "").trim();
  const address       = (formData.get("address") as string || "").trim();
  const website       = (formData.get("website") as string || "").trim();
  const industry      = (formData.get("industry") as string || "").trim();
  const logoUrl       = (formData.get("logoUrl") as string || "").trim();
  const entityType    = (formData.get("entityType") as string || "").trim();
  const registrationNumber = (formData.get("registrationNumber") as string || "").trim();
  const designation   = (formData.get("designation") as string || "").trim();
  const digitalSignature = (formData.get("digitalSignature") as string || "").trim() === "yes";
  let notes           = (formData.get("notes") as string || "").trim();
  if (digitalSignature) {
    notes = notes ? `${notes}\n[Digital/e-signature accepted for MoU]` : "[Digital/e-signature accepted for MoU]";
  }

  if (!companyName || !contactPerson || !contactNumber) {
    return { success: false as const, error: "Company name, contact person, and contact number are required." };
  }

  // Duplicate / conflict-of-interest guard: block if the same organisation is
  // already registered anywhere on the network by a different partner.
  const allCompanies = await getB2BCompanies();
  const normalized = companyName.toLowerCase().replace(/\s+/g, " ").trim();
  const conflict = allCompanies.find(
    (c) => c.companyName.toLowerCase().replace(/\s+/g, " ").trim() === normalized,
  );
  if (conflict) {
    if (conflict.partnerId === partner.id) {
      return { success: false as const, error: `You have already registered "${conflict.companyName}".` };
    }
    return {
      success: false as const,
      error: `"${conflict.companyName}" is already registered on the network by another partner (Global ID ${conflict.globalId || "N/A"}). To avoid a conflict of interest, please contact SCCG.`,
    };
  }

  // Unique global ID for this B2B partner across the whole network
  const globalId = `SCCG-B2B-${randomBytes(4).toString("hex").toUpperCase()}`;

  try {
    const created = await createB2BCompany({
      globalId,
      partnerId:     partner.id,
      partnerName:   partner.name || partner.company,
      companyName,
      entityType:    entityType || undefined,
      registrationNumber: registrationNumber || undefined,
      contactPerson,
      designation:   designation || undefined,
      contactNumber,
      email:    email    || undefined,
      address:  address  || undefined,
      website:  website  || undefined,
      industry: industry || undefined,
      logoUrl:  logoUrl  || undefined,
      notes:    notes    || undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    revalidatePath("/partner/b2b");
    return { success: true as const, data: created };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to add B2B company." };
  }
}

export async function updateB2BStatusAction(id: string, status: "active" | "inactive" | "pending", agreementUrl?: string) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  try {
    await updateB2BCompanyStatus(id, status, agreementUrl);
    revalidatePath("/partner/b2b");
    return { success: true as const };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to update status." };
  }
}

export async function generateB2BCertificateAction(b2bCompanyId: string) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return { success: false as const, error: "Partner not found" };

  // Load the specific B2B company (must belong to this partner)
  const myCompanies = await getB2BCompanies(partner.id);
  const b2bCompany = myCompanies.find((c) => c.id === b2bCompanyId);
  if (!b2bCompany) return { success: false as const, error: "B2B company not found" };

  // Generate a unique cert code
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const certCode = `COOP-${dateStr}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const certIssuedAt = new Date().toISOString();

  // Persist the cert code so the QR verification page can resolve it.
  // This MUST succeed — otherwise the issued certificate's QR/code would not
  // verify. Surface any failure instead of silently swallowing it.
  try {
    await updateB2BCertificate(b2bCompanyId, certCode, certIssuedAt);
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message || "Could not save the certificate. Please try again so its QR code stays verifiable.",
    };
  }

  revalidatePath("/partner/b2b");

  // Extract city from a free-form address (used only for the sub-partner)
  const extractCity = (addr?: string) => {
    if (!addr) return "";
    const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1] ?? "";
  };

  return {
    success: true as const,
    data: {
      certCode,
      certIssuedAt,
      globalId: b2bCompany.globalId,
      partnerName: partner.company || partner.name,
      partnerCity: "Germany",
      partnerLogoUrl: partner.logoUrl,
      subPartnerName: b2bCompany.companyName,
      subPartnerCity: b2bCompany.city || extractCity(b2bCompany.address) || "",
      subPartnerIndustry: b2bCompany.industry,
      subPartnerLogoUrl: b2bCompany.logoUrl,
      subPartnerEmail: b2bCompany.email || "",
      verifyUrl: `https://portal.mysccg.de/verify/${certCode}`,
    },
  };
}

/**
 * Email the issued Certificate of Cooperation (PDF attached) to the B2B partner.
 * The PDF is generated client-side and passed here as base64 so we reuse the
 * exact same rendering shown in the preview.
 */
export async function sendB2BCertificateEmailAction(input: {
  b2bCompanyId: string;
  toEmail: string;
  pdfBase64: string;
  certCode: string;
  verifyUrl: string;
}) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return { success: false as const, error: "Partner not found" };

  const toEmail = (input.toEmail || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return { success: false as const, error: "Please enter a valid recipient email address." };
  }

  // Ownership check — the certificate must belong to one of this partner's B2B companies
  const myCompanies = await getB2BCompanies(partner.id);
  const b2bCompany = myCompanies.find((c) => c.id === input.b2bCompanyId);
  if (!b2bCompany) return { success: false as const, error: "B2B company not found" };

  const base64 = (input.pdfBase64 || "").replace(/^data:application\/pdf;base64,/, "");
  if (!base64) return { success: false as const, error: "Certificate file could not be prepared." };

  try {
    const { sendEmailViaGraph, buildB2BCertificateEmail } = await import("@/lib/email");
    const emailData = buildB2BCertificateEmail({
      partnerName: partner.company || partner.name,
      subPartnerName: b2bCompany.companyName,
      certCode: input.certCode,
      verifyUrl: input.verifyUrl,
    });
    await sendEmailViaGraph({
      to: toEmail,
      toName: b2bCompany.contactPerson || b2bCompany.companyName,
      subject: emailData.subject,
      htmlBody: emailData.htmlBody,
      attachments: [
        {
          name: `Certificate_of_Cooperation_${input.certCode}.pdf`,
          contentType: "application/pdf",
          contentBase64: base64,
        },
      ],
    });
    return { success: true as const };
  } catch (err: any) {
    return { success: false as const, error: err?.message || "Failed to send the certificate email." };
  }
}
