"use client";
 
import { ClipboardList, FileText, CreditCard, CheckSquare, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format, parseISO, isPast } from "date-fns";
import type { CandidateTask } from "@/types";
import { useRouter } from "next/navigation";

interface TasksWidgetProps {
  tasks: CandidateTask[];
}

const CATEGORY_ICONS = {
  "Document Required": FileText,
  "Payment Due": CreditCard,
  "General Task": ClipboardList,
};

const CATEGORY_COLORS = {
  "Document Required": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Payment Due": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "General Task": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function TasksWidget({ tasks }: TasksWidgetProps) {
  const router = useRouter();
  
  const active = tasks
    .filter((t) => t.status === "todo" || t.status === "in-progress")
    .slice(0, 8);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a") || (e.target as HTMLElement).closest("button")) {
      return;
    }
    router.push("/partner/tasks");
  };

  if (active.length === 0) {
    return (
      <div 
        onClick={handleCardClick}
        className="bg-card rounded-2xl border p-6 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-300 relative group/tile"
      >
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="font-semibold text-foreground">My Tasks Engine</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">All tasks completed</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleCardClick}
      className="bg-card rounded-2xl border p-6 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-300 relative group/tile flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">My Tasks Engine</h3>
          </div>
          <span className="text-xs text-muted-foreground">{active.length} active</span>
        </div>

        <div className="space-y-3">
          {active.map((task) => {
            const Icon = CATEGORY_ICONS[task.taskCategory] || ClipboardList;
            const isOverdue = task.dueDate && isPast(parseISO(task.dueDate));
            const colorClass = CATEGORY_COLORS[task.taskCategory];

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors group"
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  {task.candidateName && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {task.candidateName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${colorClass}`}>
                      {task.taskCategory}
                    </span>
                    {task.dueDate && (
                      <span
                        className={`text-xs flex items-center gap-0.5 ${
                          isOverdue
                            ? "text-red-500 dark:text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                        {format(parseISO(task.dueDate), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/partner/candidates/${task.candidateId}`}
                  className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  View →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <Link
        href="/partner/tasks"
        className="mt-4 flex items-center justify-center text-sm text-primary hover:underline font-semibold"
      >
        View all tasks →
      </Link>
    </div>
  );
}
