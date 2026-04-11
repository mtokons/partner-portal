import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPromoCodes } from "@/lib/sharepoint";
import PromoCodesClient from "./PromoCodesClient";

export default async function AdminPromoCodesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/dashboard");

  const promoCodes = await getPromoCodes();

  return <PromoCodesClient promoCodes={promoCodes} />;
}
