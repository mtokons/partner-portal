import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getExpertById, getCvsForExpert, getAllEvaluationsForExpert } from "@/lib/expert-bank";
import ExpertProfileClient from "./ExpertProfileClient";

export const dynamic = "force-dynamic";

export default async function ExpertProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/admin/dashboard");

  const { id } = await params;
  const expert = await getExpertById(id);
  if (!expert) notFound();

  const { getProjectPartnerUsers } = await import("@/lib/ppms-users");

  const [cvs, evaluations, partnerUsers] = await Promise.all([
    getCvsForExpert(id),
    getAllEvaluationsForExpert(expert),
    getProjectPartnerUsers(),
  ]);

  return (
    <div className="h-full p-0">
      <ExpertProfileClient
        expert={expert}
        cvs={cvs}
        evaluations={evaluations}
        partners={partnerUsers.map((u) => ({
          id: u.id,
          name: u.displayName || u.email,
          orgId: u.orgId,
          orgName: u.orgName,
          role: u.role,
        }))}
      />
    </div>
  );
}
