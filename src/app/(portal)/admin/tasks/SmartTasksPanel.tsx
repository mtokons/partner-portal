import { getComputedTasks, type ComputedTask, type ComputedTaskSeverity } from "@/lib/computed-tasks";
import Link from "next/link";
import { AlertTriangle, CalendarClock, FileText, HandCoins, CreditCard, Sparkles } from "lucide-react";

const severityClass: Record<ComputedTaskSeverity, string> = {
  critical: "bg-red-50 border-red-200 text-red-800",
  high: "bg-orange-50 border-orange-200 text-orange-800",
  medium: "bg-amber-50 border-amber-200 text-amber-800",
  low: "bg-slate-50 border-slate-200 text-slate-700",
};

const sourceIcon: Record<ComputedTask["source"], React.ComponentType<{ className?: string }>> = {
  "overdue-installment": AlertTriangle,
  "unpaid-invoice": FileText,
  "pending-offer": CalendarClock,
  "eligible-expert-payment": HandCoins,
  "expiring-card": CreditCard,
};

export default async function SmartTasksPanel() {
  let tasks: ComputedTask[] = [];
  try {
    tasks = await getComputedTasks();
  } catch (err) {
    console.error("SmartTasksPanel: failed to compute tasks", err);
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        Smart tasks: nothing urgent — operational data is healthy.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Smart Tasks · Computed from operational data
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">{tasks.length} item{tasks.length === 1 ? "" : "s"}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {tasks.slice(0, 12).map((t) => {
          const Icon = sourceIcon[t.source];
          return (
            <Link
              key={t.id}
              href={t.href}
              className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all hover:shadow-md ${severityClass[t.severity]}`}
            >
              <div className="mt-0.5 h-8 w-8 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{t.title}</p>
                <p className="text-xs opacity-80 mt-0.5 truncate">{t.detail}</p>
                {t.due && (
                  <p className="text-[10px] opacity-60 mt-1">
                    Due {new Date(t.due).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {tasks.length > 12 && (
        <p className="text-xs text-muted-foreground">…and {tasks.length - 12} more</p>
      )}
    </section>
  );
}
