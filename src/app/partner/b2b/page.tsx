import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getB2BCompanies } from "@/lib/sharepoint";
import B2BClient from "./B2BClient";

export const metadata = {
  title: "My B2B Network | Partner Portal",
};

export default async function PartnerB2BPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const hasAdminRole = (user.roles || [user.role]).includes("admin");
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isSuperAdmin =
    hasAdminRole &&
    (superAdminEmails.length === 0 || superAdminEmails.includes((user.email || "").toLowerCase()));
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const [myCompanies, allCompanies] = await Promise.all([
    getB2BCompanies(partner.id),
    getB2BCompanies(),
  ]);

  return (
    <B2BClient
      myCompanies={myCompanies}
      allCompanies={allCompanies}
      partner={partner}
      isAdmin={isSuperAdmin}
    />
  );
}
