import Link from "next/link";
import { getCandidates } from "@/lib/sharepoint";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Training: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Ausbildung: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Student Visa": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Opportunity Card": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>;
}) {
  const { category, status } = await searchParams;
  const candidates = await getCandidates();

  const filtered = candidates.filter((c) => {
    if (category && c.workflowCategory !== category) return false;
    if (status && c.currentStatus !== status) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">All Candidates</h1>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} total</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {["Training", "Ausbildung", "Student Visa", "Opportunity Card"].map((cat) => (
          <Link
            key={cat}
            href={category === cat ? "/admin/candidates" : `/admin/candidates?category=${encodeURIComponent(cat)}`}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-2xl border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No candidates found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Partner</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">{c.sccgId}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.partnerName ?? c.partnerId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        CATEGORY_COLORS[c.workflowCategory] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.workflowCategory}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatStatusLabel(c.currentStatus as string)}
                    {c.isOnHold && (
                      <span className="ml-1 text-red-500">(On Hold)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    €{c.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.createdAt ? format(parseISO(c.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/candidates/${c.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
