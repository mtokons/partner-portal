// ─── Auth & Session Types ───

export type UserRole = "admin" | "partner" | "customer" | "expert";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  partnerId?: string;
  company?: string;
}
