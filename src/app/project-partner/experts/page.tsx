import { redirect } from "next/navigation";
import { getPpmsContext } from "@/lib/ppms-guard";
import { getExperts, getExpertsForPartner } from "@/lib/expert-bank";
import PartnerExpertsClient from "./PartnerExpertsClient";

export const dynamic = "force-dynamic";

export default async function PartnerExpertsPage() {
  const ctx = await getPpmsContext();
  if (!ctx) redirect("/login");

  const partnerId = ctx.org?.id || "";
  const experts = ctx.isSccgAdmin ? await getExperts() : await getExpertsForPartner(partnerId);

  return (
    <div className="h-full p-0">
      <PartnerExpertsClient
        experts={experts}
        partnerId={partnerId}
        partnerName={ctx.org?.name || ""}
        isSccgAdmin={ctx.isSccgAdmin}
      />
    </div>
  );
}
