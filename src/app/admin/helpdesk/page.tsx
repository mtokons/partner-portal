import Link from "next/link";
import { getHelpdeskTickets } from "@/lib/sharepoint";
import { format, parseISO } from "date-fns";
import { LifeBuoy } from "lucide-react";

const STATUS_COLORS = {
  open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-muted text-muted-foreground",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_COLORS = {
  low: "text-muted-foreground",
  regular: "text-blue-600 dark:text-blue-400",
  high: "text-red-600 dark:text-red-400",
};

export default async function AdminHelpdeskPage() {
  const tickets = await getHelpdeskTickets();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Helpdesk</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {tickets.filter((t) => t.status === "open").length} open
        </span>
      </div>

      <div className="bg-card rounded-2xl border overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No tickets.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted By</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">{t.sccgId}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <p>{t.submittedByName}</p>
                    <p>{t.submittedByEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{t.category}</td>
                  <td className={`px-4 py-3 font-medium capitalize ${PRIORITY_COLORS[t.priority]}`}>
                    {t.priority}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>
                      {t.status.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(parseISO(t.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/partner/support/${t.id}`}
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
