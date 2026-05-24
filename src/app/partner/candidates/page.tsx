import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getCandidates, getCandidateServices, getPartnerByEmail } from "@/lib/sharepoint";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { UserPlus, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import CandidateListClient from "./CandidateListClient";

export default async function CandidatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = roles.includes("admin");

  let partnerId: string | undefined;
  if (!isAdmin) {
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) redirect("/partner-pending");
    partnerId = partner.id;
  }

  const candidates = await getCandidates(partnerId);

  // Fetch services for each candidate
  const candidatesWithServices = await Promise.all(
    candidates.map(async (c) => {
      const services = await getCandidateServices(c.id);
      return { ...c, services };
    })
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">My Candidates</h1>
          <span className="text-sm text-muted-foreground ml-2">({candidates.length})</span>
        </div>
        <Link
          href="/partner/candidates/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Register A New Candidate
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-card border rounded-2xl p-16 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="font-medium text-muted-foreground">No candidates yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Register your first candidate to get started.</p>
          <Link
            href="/partner/candidates/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Register A New Candidate
          </Link>
        </div>
      ) : (
        <CandidateListClient candidates={candidatesWithServices} />
      )}
    </div>
  );
}
