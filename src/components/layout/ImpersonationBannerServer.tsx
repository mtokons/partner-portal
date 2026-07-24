/**
 * Server component: reads impersonation cookie and renders the banner if active.
 * Import this in every role layout (admin, partner, customer, expert, student).
 */
import { getImpersonationSession } from "@/lib/impersonation";
import ImpersonationBanner from "./ImpersonationBanner";

export default async function ImpersonationBannerServer() {
  const session = await getImpersonationSession();
  if (!session) return null;

  return (
    <ImpersonationBanner
      adminName={session.adminName}
      targetName={session.targetName}
      targetEmail={session.targetEmail}
      targetRoles={session.targetRoles}
    />
  );
}
