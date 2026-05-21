import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail } from "@/lib/sharepoint";
import { getTierFromCommission } from "@/lib/engine/financial-split";
import { WizardShell } from "./WizardShell";

export default async function RegisterCandidatePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const { margin } = getTierFromCommission(partner.commissionTier ?? "standard");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Register Candidate</h1>
      <WizardShell partnerMargin={margin} partnerId={partner.id} />
    </div>
  );
}
