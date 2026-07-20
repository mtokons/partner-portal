import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getExperts } from "@/lib/expert-bank";
import { getProjectOrgs } from "@/lib/project-orgs";
import ExpertBankClient from "./ExpertBankClient";
import { graphGetSafe, getSiteListUrlAsync } from "@/lib/graph";

export const dynamic = "force-dynamic";

export default async function ExpertBankPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/admin/dashboard");

  const [experts, orgs, bankEvalsRes, legacyEvalsRes] = await Promise.all([
    getExperts(),
    getProjectOrgs(),
    getSiteListUrlAsync("ExpertEvaluationBank").then((base) =>
      graphGetSafe<{ value: Array<{ fields: Record<string, unknown> }> }>(`${base}?$expand=fields&$top=1500`)
    ),
    getSiteListUrlAsync("ProjectEvaluations").then((base) =>
      graphGetSafe<{ value: Array<{ fields: Record<string, unknown> }> }>(`${base}?$expand=fields&$top=1500`)
    ),
  ]);

  const bankEvals = (bankEvalsRes?.value || []).map((item) => ({
    expertId: String(item.fields?.ExpertId || ""),
    percentage: Number(item.fields?.Percentage) || 0,
  }));

  const legacyEvals = (legacyEvalsRes?.value || []).map((item) => ({
    expertName: String(item.fields?.Title || "").trim().toLowerCase(),
    percentage: Number(item.fields?.Percentage) || 0,
  }));

  const bankSuitability = new Set(
    bankEvals.filter((ev) => ev.percentage >= 85).map((ev) => ev.expertId)
  );

  const legacySuitabilityName = new Set(
    legacyEvals.filter((ev) => ev.percentage >= 85).map((ev) => ev.expertName)
  );

  const suitabilityByExpertId: Record<string, boolean> = {};
  for (const expert of experts) {
    const isSuitable = bankSuitability.has(expert.id) || legacySuitabilityName.has(expert.expertName.trim().toLowerCase());
    suitabilityByExpertId[expert.id] = isSuitable;
  }

  return (
    <div className="h-full p-0">
      <ExpertBankClient
        experts={experts}
        partners={orgs.map((o) => ({ id: o.id, name: o.name }))}
        suitabilityByExpertId={suitabilityByExpertId}
      />
    </div>
  );
}
