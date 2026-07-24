import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getGiftCards } from "@/lib/sharepoint";
import { getAdminFirestore } from "@/lib/firebase-admin";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  // Role-specific profile redirects
  const roles = (user.roles || [user.role]) as string[];
  const lowerRoles = roles.map((r) => r.toLowerCase());
  if (lowerRoles.includes("admin")) redirect("/admin/overview");
  if (lowerRoles.some((r) => ["partner", "partner-individual", "partner-institutional"].includes(r)))
    redirect("/partner/settings");

  const [cards, userDoc] = await Promise.all([
    getGiftCards(user.id),
    getAdminFirestore().collection("users").doc(user.id).get().catch(() => null),
  ]);

  const rawCreatedAt = userDoc?.data()?.createdAt;
  const registrationDate: string | undefined = rawCreatedAt
    ? typeof rawCreatedAt === "string"
      ? rawCreatedAt
      : typeof rawCreatedAt?.toDate === "function"
      ? (rawCreatedAt.toDate() as Date).toISOString()
      : undefined
    : undefined;

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name || "User",
        email: user.email || "",
        role: user.role,
        company: user.company,
        partnerId: user.partnerId,
        registrationDate,
      }}
      card={cards[0] || null}
    />
  );
}
