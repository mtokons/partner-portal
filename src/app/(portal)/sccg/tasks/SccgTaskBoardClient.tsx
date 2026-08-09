"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, ClipboardList, Plus, Search, Trash2, X } from "lucide-react";
import type { CandidateTask, CandidateTaskFlow, TaskPriority, TaskStatus } from "@/types";
import {
  deleteSccgTaskAction,
  saveSccgTaskAction,
} from "./actions";

const FLOWS: Array<{ id: CandidateTaskFlow; label: string; description: string }> = [
  { id: "candidate", label: "Candidate Tasks", description: "Tasks assigned to candidates." },
  { id: "staff", label: "Staff Tasks", description: "Tasks assigned to SCCG staff." },
  { id: "sccg", label: "SCCG Tasks", description: "Internal tasks assigned within SCCG." },
];

const STATUSES: Array<{ id: TaskStatus; label: string }> = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "In Review" },
  { id: "done", label: "Done" },
];

const PRIORITIES: Array<{ id: TaskPriority; label: string; className: string }> = [
  { id: "high", label: "Prio", className: "bg-red-100 text-red-800" },
  { id: "medium", label: "General", className: "bg-blue-100 text-blue-800" },
  { id: "low", label: "Low", className: "bg-emerald-100 text-emerald-800" },
];

interface Props {
  initialTasks: CandidateTask[];
  candidates: Array<{ id: string; fullName: string; sccgId: string }>;
}

export default function SccgTaskBoardClient({ initialTasks, candidates }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [flow, setFlow] = useState<CandidateTaskFlow>("sccg");
  const [query, setQuery] = useState("");
  const [editingTask, setEditingTask] = useState<Partial<CandidateTask> | null>(null);
  const [isPending, startTransition] = useTransition();

  const flowTasks = useMemo(() => tasks.filter((task) => (task.taskFlow || "partner") === flow), [tasks, flow]);
  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return flowTasks;
    return flowTasks.filter((task) =>
      [task.title, task.description, task.candidateName, task.assignedToName].some((value) =>
        value?.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [flowTasks, query]);

  function createTask(status: TaskStatus = "todo") {
    setEditingTask({
      title: "",
      status,
      priority: "medium",
      taskFlow: flow,
      taskCategory: "General Task",
      workflowCategory: "Others",
      dueDate: new Date().toISOString().slice(0, 10),
      candidateId: candidates[0]?.id || "",
    });
  }

  function saveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!editingTask) return;
    startTransition(async () => {
      const result = await saveSccgTaskAction({ ...editingTask, taskFlow: flow });
      if (!result.success || !result.task) {
        alert(result.error || "Unable to save task");
        return;
      }
      setTasks((current) => {
        const index = current.findIndex((task) => task.id === result.task!.id);
        return index === -1
          ? [...current, result.task!]
          : current.map((task) => task.id === result.task!.id ? result.task! : task);
      });
      setEditingTask(null);
    });
  }

  function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    startTransition(async () => {
      const result = await deleteSccgTaskAction(taskId, flow);
      if (!result.success) return alert(result.error || "Unable to delete task");
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setEditingTask(null);
    });
  }

  const selectedFlow = FLOWS.find((item) => item.id === flow)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><ClipboardList className="h-6 w-6 text-primary" />Task Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">{selectedFlow.description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm sm:w-56" />
          </label>
          <button onClick={() => createTask()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Create task</button>
        </div>
      </div>

      <div className="inline-flex rounded-md bg-muted p-1" role="tablist" aria-label="Task flows">
        {FLOWS.map((item) => (
          <button key={item.id} onClick={() => setFlow(item.id)} className={`rounded px-4 py-2 text-sm font-medium ${flow === item.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{item.label}</button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {STATUSES.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.id);
          return (
            <section key={column.id} className="min-h-52 rounded-lg border bg-muted/25">
              <header className="flex items-center justify-between border-b px-3 py-3"><h2 className="text-sm font-semibold">{column.label}</h2><span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{columnTasks.length}</span></header>
              <div className="space-y-2 p-2">
                {columnTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={() => setEditingTask(task)} />)}
                <button onClick={() => createTask(column.id)} className="w-full rounded border border-dashed px-2 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground">+ Add task</button>
              </div>
            </section>
          );
        })}
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveTask} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border bg-background p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{editingTask.id ? "Edit task" : `Create ${selectedFlow.label.slice(0, -1)} task`}</h2><button type="button" onClick={() => setEditingTask(null)} aria-label="Close"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Candidate"><select required value={editingTask.candidateId || ""} onChange={(event) => setEditingTask({ ...editingTask, candidateId: event.target.value })} className="input"><option value="">Select candidate</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.fullName} {candidate.sccgId ? `(${candidate.sccgId})` : ""}</option>)}</select></Field>
              <Field label="Priority"><select value={editingTask.priority || "medium"} onChange={(event) => setEditingTask({ ...editingTask, priority: event.target.value as TaskPriority })} className="input">{PRIORITIES.map((priority) => <option key={priority.id} value={priority.id}>{priority.label}</option>)}</select></Field>
            </div>
            <Field label="Task title"><input required value={editingTask.title || ""} onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })} className="input" /></Field>
            <Field label="Details / comment"><textarea rows={3} value={editingTask.description || ""} onChange={(event) => setEditingTask({ ...editingTask, description: event.target.value })} className="input resize-y" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Deadline"><input type="date" value={editingTask.dueDate || ""} onChange={(event) => setEditingTask({ ...editingTask, dueDate: event.target.value })} className="input" /></Field>
              <Field label="Status"><select value={editingTask.status || "todo"} onChange={(event) => setEditingTask({ ...editingTask, status: event.target.value as TaskStatus })} className="input">{STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></Field>
            </div>
            <div className="mt-6 flex justify-between border-t pt-4">
              {editingTask.id ? <button type="button" disabled={isPending} onClick={() => deleteTask(editingTask.id!)} className="inline-flex items-center gap-1 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" />Delete</button> : <span />}
              <button disabled={isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{isPending ? "Saving..." : "Save task"}</button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`.input { width: 100%; margin-top: 0.35rem; border: 1px solid hsl(var(--border)); border-radius: 0.375rem; background: hsl(var(--background)); padding: 0.5rem 0.625rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function TaskCard({ task, onEdit }: { task: CandidateTask; onEdit: () => void }) {
  const priority = PRIORITIES.find((item) => item.id === task.priority) || PRIORITIES[1];
  return <button onClick={onEdit} className="w-full rounded-md border bg-background p-3 text-left shadow-sm hover:border-primary/50">
    <div className="mb-2 flex items-start justify-between gap-2"><span className="line-clamp-2 text-sm font-semibold">{task.title}</span><span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${priority.className}`}>{priority.label}</span></div>
    {task.candidateName && <p className="truncate text-xs text-muted-foreground">{task.candidateName}</p>}
    {task.dueDate && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" />{task.dueDate}</p>}
  </button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mb-4 block text-sm font-medium text-foreground">{label}{children}</label>;
}
