import { getEffectiveSession } from "@/lib/effective-user";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getExpertPayments, getExpertById } from "@/lib/sharepoint";
import { getWithdrawalRequests } from "@/lib/withdrawals";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { getAdminFirestore } from "@/lib/firebase-admin";
import PaymentsClient from "./PaymentsClient";

export default async function ExpertPaymentsPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  // 1. Fetch data from SharePoint and Firestore in parallel
  const [[expert, payments], withdrawalRequests, rate, dbProfile] = await Promise.all([
    Promise.all([getExpertById(user.id), getExpertPayments(user.id)]),
    getWithdrawalRequests(user.id),
    loadRate(),
    getAdminFirestore().collection("users").doc(user.id).get().then(s => s.data()),
  ]);

  if (!expert) {
    return <div className="p-8 text-center text-muted-foreground">Expert profile not fully provisioned yet.</div>;
  }

  return (
    <PaymentsClient 
      expert={expert} 
      dbProfile={dbProfile || {}}
      payments={payments} 
      withdrawalRequests={withdrawalRequests}
      rate={rate || 1} 
    />
  );
}
