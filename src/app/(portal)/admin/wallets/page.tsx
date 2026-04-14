import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getAllCoinWallets, getPartners, getCustomers, getExperts } from "@/lib/sharepoint";
import { getAdminFirestore } from "@/lib/firebase-admin";
import WalletsClient from "./WalletsClient";

export default async function AdminWalletsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/dashboard");

  const wallets = await getAllCoinWallets();
  const [partners, customers, experts] = await Promise.all([
    getPartners(),
    getCustomers(),
    getExperts(),
  ]);

  // Fetch newly registered users from Firebase Firestore
  let firebaseUsers: any[] = [];
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection("users").get();
    firebaseUsers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email?.split("@")[0] || "Unknown User",
        email: data.email || "",
        role: data.role || "firebase_user"
      };
    });
  } catch (error) {
    console.error("Failed to fetch Firebase users for wallet top-up:", error);
  }

  // Combine into a generic list
  const combinedUsers = [
    ...partners.map(p => ({ id: p.id, name: p.name, email: p.email, role: p.role })),
    ...customers.map(c => ({ id: c.id, name: c.name, email: c.email, role: "customer" })),
    ...experts.map(e => ({ id: e.id, name: e.name, email: e.email, role: "expert" })),
    ...firebaseUsers,
  ];

  // Deduplicate by email just in case
  const uniqueUsersMap = new Map();
  combinedUsers.forEach(u => {
    if (!uniqueUsersMap.has(u.email)) {
      uniqueUsersMap.set(u.email, u);
    }
  });

  return <WalletsClient wallets={wallets} users={Array.from(uniqueUsersMap.values())} />;
}
