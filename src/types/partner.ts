// ─── Partner & Client Types ───

export type PartnerStatus = "pending" | "active" | "suspended";
export type PartnerOnboardingStatus = "application" | "review" | "approved" | "rejected";

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  role: "admin" | "partner";
  status: PartnerStatus;
  onboardingStatus: PartnerOnboardingStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  partnerId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  createdAt: string;
  updatedAt?: string;
}
