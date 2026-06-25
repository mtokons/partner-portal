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
  const notes         = (formData.get("notes") as string || "").trim();

  if (!companyName || !contactPerson || !contactNumber) {
    return { success: false as const, error: "Company name, contact person, and contact number are required." };
  }

  try {
    const created = await createB2BCompany({
      partnerId:     partner.id,
      partnerName:   partner.name || partner.company,
      companyName,
      contactPerson,
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
      partnerName: partner.company || partner.name,
      partnerCity: "Germany",
      partnerLogoUrl: partner.logoUrl,
      subPartnerName: b2bCompany.companyName,
      subPartnerCity: b2bCompany.city || extractCity(b2bCompany.address) || "",
      subPartnerIndustry: b2bCompany.industry,
      subPartnerLogoUrl: b2bCompany.logoUrl,
      verifyUrl: `https://portal.mysccg.de/verify/${certCode}`,
    },
  };
}
