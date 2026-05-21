import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getCandidates } from "@/lib/sharepoint";
import { getPartnerByEmail } from "@/lib/sharepoint";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { UserPlus, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  Training: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Ausbildung: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Student Visa": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Opportunity Card": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DOCUMENTS_UNDER_REVIEW: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  TRAINING_FINISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">My Candidates</h1>
        </div>
        <Link
          href="/partner/candidates/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Register Candidate
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No candidates yet</p>
          <p className="text-sm mt-1">Register your first candidate to get started.</p>
          <Link
            href="/partner/candidates/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Register Candidate
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Service Fee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.sccgId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium ${
                        CATEGORY_COLORS[c.workflowCategory] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.workflowCategory}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium ${
                        STATUS_COLORS[c.currentStatus as string] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {formatStatusLabel(c.currentStatus as string)}
                    </span>
                    {c.isOnHold && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-md font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        On Hold
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    €{c.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.createdAt ? format(parseISO(c.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/partner/candidates/${c.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
