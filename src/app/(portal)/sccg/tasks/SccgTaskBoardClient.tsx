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
  { id: "partner", label: "Partner Tasks", description: "Tasks assigned to partners." },
  { id: "staff", label: "Staff Tasks", description: "Tasks assigned to SCCG staff." },
  { id: "sccg", label: "SCCG Tasks", description: "Internal tasks assigned within SCCG." },
];

const STATUSES: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: "backlog", label: "Backlog", color: "border-t-slate-500 bg-slate-500/5 text-slate-500 dark:text-slate-400" },
  { id: "todo", label: "To Do", color: "border-t-indigo-500 bg-indigo-500/5 text-indigo-500 dark:text-indigo-400" },
  { id: "in-progress", label: "In Progress", color: "border-t-amber-500 bg-amber-500/5 text-amber-500 dark:text-amber-400" },
  { id: "review", label: "In Review", color: "border-t-violet-500 bg-violet-500/5 text-violet-500 dark:text-violet-400" },
  { id: "done", label: "Done", color: "border-t-emerald-500 bg-emerald-500/5 text-emerald-500 dark:text-emerald-400" },
];

const PRIORITIES: Array<{ id: TaskPriority; label: string; className: string }> = [
  { id: "high", label: "Prio", className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
  { id: "medium", label: "General", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" },
  { id: "low", label: "Low", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
];

interface Props {
  initialTasks: CandidateTask[];
  candidates: Array<{ id: string; fullName: string; sccgId: string }>;
  partners: Array<{ id: string; companyName: string; email: string }>;
  staff: Array<{ id: string; name: string; email: string }>;
}

export default function SccgTaskBoardClient({ initialTasks, candidates, partners, staff }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [flow, setFlow] = useState<CandidateTaskFlow>("sccg");
  const [query, setQuery] = useState("");
  const [editingTask, setEditingTask] = useState<Partial<CandidateTask> | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return tasks;
    return tasks.filter((task) =>
      [task.title, task.description, task.candidateName, task.assignedToName].some((value) =>
        value?.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [tasks, query]);

  function createTask(status: TaskStatus = "todo") {
    setEditingTask({
      title: "",
      status,
      priority: "medium",
      taskFlow: "sccg",
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
      const result = await saveSccgTaskAction({ ...editingTask });
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

  function deleteTask(taskId: string, taskFlow: CandidateTaskFlow) {
    if (!confirm("Delete this task?")) return;
    startTransition(async () => {
      const result = await deleteSccgTaskAction(taskId, taskFlow);
      if (!result.success) return alert(result.error || "Unable to delete task");
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setEditingTask(null);
    });
  }

  function handleMoveStage(task: CandidateTask, direction: "next" | "prev") {
    const stageOrder: TaskStatus[] = ["backlog", "todo", "in-progress", "review", "done"];
    const idx = stageOrder.indexOf(task.status);
    let nextIdx = idx;
    if (direction === "next" && idx < stageOrder.length - 1) nextIdx = idx + 1;
    if (direction === "prev" && idx > 0) nextIdx = idx - 1;
    
    if (nextIdx !== idx) {
      const nextStatus = stageOrder[nextIdx];
      // Optimistic update
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
      startTransition(async () => {
        const result = await saveSccgTaskAction({ ...task, status: nextStatus });
        if (!result.success) {
          // Revert on error
          alert(result.error || "Failed to move task");
          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
        }
      });
    }
  }

  const selectedFlow = FLOWS.find((item) => item.id === editingTask?.taskFlow) || FLOWS[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><ClipboardList className="h-6 w-6 text-primary" />Task Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage all system tasks across candidates, partners, and staff.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm sm:w-56" />
          </label>
          <button onClick={() => createTask()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Create task</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {STATUSES.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.id);
          return (
            <div 
              key={column.id} 
              className={`rounded-2xl border-t-4 p-4 min-h-[500px] flex flex-col space-y-4 shadow-xl ${column.color}`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="font-bold text-sm text-foreground">{column.label}</span>
                <span className="px-2 py-0.5 bg-muted/80 rounded-full text-xs font-bold">{columnTasks.length}</span>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto">
                {columnTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onEdit={() => setEditingTask(task)} 
                    onMove={(dir) => handleMoveStage(task, dir)}
                  />
                ))}
                <button onClick={() => createTask(column.id)} className="w-full mt-2 rounded-xl border border-dashed border-border/60 px-2 py-3 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground hover:bg-muted/30 transition-colors">+ Add task</button>
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveTask} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border bg-background p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{editingTask.id ? "Edit task" : `Create task`}</h2><button type="button" onClick={() => setEditingTask(null)} aria-label="Close"><X className="h-5 w-5" /></button></div>
            
            <Field label="Who is this task for?">
              <select 
                value={editingTask.taskFlow || "sccg"} 
                onChange={(event) => setEditingTask({ ...editingTask, taskFlow: event.target.value as CandidateTaskFlow, assignedTo: "", assignedToName: "", assignedToEmail: "" })} 
                className="input"
              >
                {FLOWS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Candidate">
                <select required value={editingTask.candidateId || ""} onChange={(event) => setEditingTask({ ...editingTask, candidateId: event.target.value })} className="input">
                  <option value="">Select candidate</option>
                  {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.fullName} {candidate.sccgId ? `(${candidate.sccgId})` : ""}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={editingTask.priority || "medium"} onChange={(event) => setEditingTask({ ...editingTask, priority: event.target.value as TaskPriority })} className="input">
                  {PRIORITIES.map((priority) => <option key={priority.id} value={priority.id}>{priority.label}</option>)}
                </select>
              </Field>
            </div>
            
            {editingTask.taskFlow === "partner" && (
              <Field label="Assign To (Partner)">
                <select 
                  required 
                  value={editingTask.assignedTo || ""} 
                  onChange={(e) => {
                    const selected = partners.find(p => p.id === e.target.value);
                    setEditingTask({ ...editingTask, assignedTo: selected?.id, assignedToName: selected?.companyName, assignedToEmail: selected?.email });
                  }} 
                  className="input"
                >
                  <option value="">Select Partner</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.companyName}</option>)}
                </select>
              </Field>
            )}
            
            {(editingTask.taskFlow === "staff" || editingTask.taskFlow === "sccg") && (
              <Field label="Assign To (Staff)">
                <select 
                  required 
                  value={editingTask.assignedTo || ""} 
                  onChange={(e) => {
                    const selected = staff.find(s => s.id === e.target.value);
                    setEditingTask({ ...editingTask, assignedTo: selected?.id, assignedToName: selected?.name, assignedToEmail: selected?.email });
                  }} 
                  className="input"
                >
                  <option value="">Select Staff</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            )}

            <Field label="Task title"><input required value={editingTask.title || ""} onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })} className="input" /></Field>
            <Field label="Details / comment"><textarea rows={3} value={editingTask.description || ""} onChange={(event) => setEditingTask({ ...editingTask, description: event.target.value })} className="input resize-y" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Deadline"><input type="date" value={editingTask.dueDate || ""} onChange={(event) => setEditingTask({ ...editingTask, dueDate: event.target.value })} className="input" /></Field>
              <Field label="Status"><select value={editingTask.status || "todo"} onChange={(event) => setEditingTask({ ...editingTask, status: event.target.value as TaskStatus })} className="input">{STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></Field>
            </div>
            <div className="mt-6 flex justify-between border-t pt-4">
              {editingTask.id ? <button type="button" disabled={isPending} onClick={() => deleteTask(editingTask.id!, editingTask.taskFlow as CandidateTaskFlow)} className="inline-flex items-center gap-1 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" />Delete</button> : <span />}
              <button disabled={isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{isPending ? "Saving..." : "Save task"}</button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`.input { width: 100%; margin-top: 0.35rem; border: 1px solid hsl(var(--border)); border-radius: 0.375rem; background: hsl(var(--background)); padding: 0.5rem 0.625rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function TaskCard({ task, onEdit, onMove }: { task: CandidateTask; onEdit: () => void; onMove: (dir: "next"|"prev") => void }) {
  const priority = PRIORITIES.find((item) => item.id === task.priority) || PRIORITIES[1];
  return (
    <div className="bg-card border border-border/60 p-4 rounded-xl space-y-3 shadow-md hover:border-primary/50 transition-all flex flex-col justify-between group">
      <div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">{task.taskCategory || "General Task"}</span>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold ${priority.className}`}>{priority.label}</span>
        </div>
        <button onClick={onEdit} className="text-left w-full hover:opacity-80">
          <h3 className="font-semibold text-sm mt-1 text-foreground leading-snug">{task.title}</h3>
        </button>
        
        {task.candidateName && (
          <div className="mt-3 flex items-center space-x-1.5 text-[10px] bg-primary/10 text-primary px-2 py-1 rounded w-fit">
            <span className="truncate max-w-[140px]">👤 {task.candidateName}</span>
          </div>
        )}
        {task.assignedToName && (
          <div className="mt-1.5 flex items-center space-x-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded w-fit">
            <span className="truncate max-w-[140px]">✓ Assig: {task.assignedToName.split(" ")[0]}</span>
          </div>
        )}
      </div>

      <div className="border-t border-border/50 pt-3 flex justify-between items-center mt-3">
        <button 
          onClick={() => onMove("prev")}
          disabled={task.status === "backlog"}
          className="text-[10px] font-semibold px-2 py-1 bg-muted/40 border border-border/50 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
        >
          ◀
        </button>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <CalendarDays className="h-3 w-3 opacity-70" />
            {task.dueDate}
          </span>
        )}
        <button 
          onClick={() => onMove("next")}
          disabled={task.status === "done"}
          className="text-[10px] font-semibold px-2 py-1 bg-muted/40 border border-border/50 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mb-4 block text-sm font-medium text-foreground">{label}{children}</label>;
}
