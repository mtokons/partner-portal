import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  const isPartner = roles.some((r) =>
    ["partner-individual", "partner-institutional"].includes(r)
  );

  if (!isPartner) redirect("/dashboard");

  // Centralized approval gate:
  // Approved partners will always have a valid partnerId in their session.
  // Unapproved or pending partners will not have a partnerId.
  if (!user.partnerId) {
    redirect("/partner-pending");
  }

  return <>{children}</>;
}
