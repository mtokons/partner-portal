import { auth } from "@/auth";
import { getGiftCards } from "@/lib/sharepoint";
import GiftCardsClient from "./GiftCardsClient";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";

export default async function GiftCardsAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) {
    redirect("/dashboard");
  }

  const giftCards = await getGiftCards();

  return <GiftCardsClient giftCards={giftCards} />;
}
