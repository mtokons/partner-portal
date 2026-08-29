"use client";

import { useMemo, useState, useRef, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Plus,
  Search,
  Trash2,
  X,
  User,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  Layers,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  FolderGit2,
  Edit3,
  MessageCircle,
  Send,
} from "lucide-react";
import type { CandidateTask, CandidateTaskFlow, TaskPriority, TaskStatus, TaskComment } from "@/types";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/SearchableCombobox";
import {
  deleteSccgTaskAction,
  saveSccgTaskAction,
  updateSccgTaskStatusAction,
  addTaskCommentAction,
} from "./actions";

export const FLOWS: Array<{ id: CandidateTaskFlow; label: string; description: string }> = [
  { id: "sccg", label: "Task for SCCG-Admin", description: "General SCCG internal operational task." },
  { id: "staff", label: "Task for SCCG-Staff", description: "Assigned to a specific SCCG staff member (in-app + email notification)." },
  { id: "partner", label: "Task for Partner", description: "Assigned to a partner (sends automatic email with partner portal link)." },
  { id: "candidate", label: "Task for Candidate", description: "Assigned to a candidate (sends automatic email with portal link)." },
];

export const STATUSES: Array<{ id: TaskStatus; label: string; color: string; dot: string }> = [
  { id: "backlog", label: "Task List", color: "border-t-slate-500 bg-slate-500/5 text-slate-500 dark:text-slate-400", dot: "bg-slate-400" },
  { id: "todo", label: "To Do", color: "border-t-indigo-500 bg-indigo-500/5 text-indigo-500 dark:text-indigo-400", dot: "bg-indigo-500" },
  { id: "in-progress", label: "In Progress", color: "border-t-amber-500 bg-amber-500/5 text-amber-500 dark:text-amber-400", dot: "bg-amber-500" },
  { id: "review", label: "In Review", color: "border-t-violet-500 bg-violet-500/5 text-violet-500 dark:text-violet-400", dot: "bg-violet-500" },
  { id: "done", label: "Done", color: "border-t-emerald-500 bg-emerald-500/5 text-emerald-500 dark:text-emerald-400", dot: "bg-emerald-500" },
];

export const PRIORITIES: Array<{ id: TaskPriority; label: string; className: string }> = [
  { id: "high", label: "High", className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
  { id: "medium", label: "Medium", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" },
  { id: "low", label: "Low", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
];

export interface TaskBoardProps {
  initialTasks: CandidateTask[];
  candidates: Array<{ id: string; fullName: string; sccgId: string; email?: string }>;
  partners: Array<{ id: string; companyName: string; email: string; category?: string }>;
  staff: Array<{ id: string; name: string; email: string; category?: string }>;
  viewMode?: "admin" | "personal";
  currentUserEmail?: string;
  currentUserId?: string;
  currentUserName?: string;
  title?: string;
  subtitle?: string;
}

export default function SccgTaskBoardClient({
  initialTasks,
  candidates,
  partners,
  staff,
  viewMode = "admin",
  currentUserEmail = "",
  currentUserId = "",
  currentUserName = "",
  title = "Task Board",
  subtitle = "Manage all operational and automated tasks across candidates, partners, and staff.",
}: TaskBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [selectedFlowFilter, setSelectedFlowFilter] = useState<string>("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">(viewMode === "personal" ? "mine" : "all");
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Modals state: Separate Create vs Edit
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<Partial<CandidateTask>>({
    title: "",
    description: "",
    status: "backlog",
    priority: "medium",
    taskFlow: "sccg",
    taskCategory: "General Task",
    workflowCategory: "Others",
    dueDate: new Date().toISOString().slice(0, 10),
    candidateId: "",
    assignedTo: "",
    assignedToName: "",
    assignedToEmail: "",
  });

  const [editingTask, setEditingTask] = useState<CandidateTask | null>(null);
  const [editTab, setEditTab] = useState<"details" | "comments">("details");
  const [commentText, setCommentText] = useState("");
  const commentEndRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Determine if current user is admin
  const isAdmin = viewMode === "admin";

  // Searchable combobox options
  const candidateOptions: ComboboxOption[] = useMemo(() => {
    return candidates.map((c) => ({
      id: c.id,
      label: c.fullName || "Unnamed Candidate",
      subLabel: c.sccgId ? `ID: ${c.sccgId}` : undefined,
      badge: c.sccgId || "Candidate",
    }));
  }, [candidates]);

  const partnerOptions: ComboboxOption[] = useMemo(() => {
    return partners.map((p) => ({
      id: p.id,
      label: p.companyName || "Unnamed Partner",
      subLabel: p.email || undefined,
      badge: "Partner",
    }));
  }, [partners]);

  const staffOptions: ComboboxOption[] = useMemo(() => {
    const uniqueStaff = Array.from(new Map(staff.map((s) => [s.id, s])).values());
    return uniqueStaff.map((s) => ({
      id: s.id,
      label: s.name || s.email || "Staff Member",
      subLabel: s.email !== s.name ? s.email : undefined,
      badge: s.category || "sccg-staff",
    }));
  }, [staff]);

  const normalizedUserEmail = currentUserEmail.trim().toLowerCase();

  // Filter tasks based on search, flow category, priority, user scope, and visibility rules
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Visibility rule: Non-admin users can only see tasks they created or are assigned to
      if (!isAdmin && normalizedUserEmail) {
        const isAssignedEmail = (task.assignedToEmail || "").toLowerCase() === normalizedUserEmail;
        const isAssignedId = currentUserId && task.assignedTo === currentUserId;
        const isCreatedBy = currentUserId && task.createdBy === currentUserId;
        const isCreatedByEmail = (task.createdByEmail || "").toLowerCase() === normalizedUserEmail;
        if (!isAssignedEmail && !isAssignedId && !isCreatedBy && !isCreatedByEmail) {
          return false;
        }
      }

      // 1. User scope filter (Mine vs All) — for admin users
      if (isAdmin && scopeFilter === "mine" && normalizedUserEmail) {
        const isAssignedEmail = (task.assignedToEmail || "").toLowerCase() === normalizedUserEmail;
        const isAssignedId = currentUserId && task.assignedTo === currentUserId;
        const isCreatedBy = currentUserId && task.createdBy === currentUserId;
        if (!isAssignedEmail && !isAssignedId && !isCreatedBy) {
          return false;
        }
      }

      // 2. Flow category filter
      if (selectedFlowFilter !== "all") {
        if (task.taskFlow !== selectedFlowFilter) {
          return false;
        }
      }

      // 3. Priority filter
      if (selectedPriorityFilter !== "all") {
        if (task.priority !== selectedPriorityFilter) {
          return false;
        }
      }

      // 4. Search query
      const normalizedQuery = query.trim().toLowerCase();
      if (normalizedQuery) {
        const matches = [
          task.title,
          task.description,
          task.candidateName,
          task.assignedToName,
          task.taskCategory,
        ].some((val) => val && val.toLowerCase().includes(normalizedQuery));
        if (!matches) return false;
      }

      return true;
    });
  }, [tasks, query, selectedFlowFilter, selectedPriorityFilter, scopeFilter, normalizedUserEmail, currentUserId, isAdmin]);

  function openCreateModal(initialFlow: CandidateTaskFlow = "sccg", initialStatus: TaskStatus = "backlog") {
    let defaultAssignedTo = "";
    let defaultAssignedToName = "";
    let defaultAssignedToEmail = "";

    if (viewMode === "personal" && normalizedUserEmail) {
      const matchStaff = staff.find((s) => s.email.toLowerCase() === normalizedUserEmail);
      const matchPartner = partners.find((p) => p.email.toLowerCase() === normalizedUserEmail);
      if (initialFlow === "staff" && matchStaff) {
        defaultAssignedTo = matchStaff.id;
        defaultAssignedToName = matchStaff.name;
        defaultAssignedToEmail = matchStaff.email;
      } else if (initialFlow === "partner" && matchPartner) {
        defaultAssignedTo = matchPartner.id;
        defaultAssignedToName = matchPartner.companyName;
        defaultAssignedToEmail = matchPartner.email;
      }
    }

    setCreateData({
      title: "",
      description: "",
      status: initialStatus,
      priority: "medium",
      taskFlow: initialFlow,
      taskCategory: "General Task",
      workflowCategory: "Others",
      dueDate: new Date().toISOString().slice(0, 10),
      candidateId: "",
      assignedTo: defaultAssignedTo,
      assignedToName: defaultAssignedToName,
      assignedToEmail: defaultAssignedToEmail,
    });
    setIsCreateOpen(true);
  }

  function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!createData.title?.trim()) {
      alert("Please enter a task title.");
      return;
    }

    if (createData.taskFlow === "candidate" && !createData.candidateId) {
      alert("Please select a candidate for candidate tasks.");
      return;
    }

    if (createData.taskFlow === "partner" && !createData.assignedTo) {
      alert("Please select a partner to assign this task to.");
      return;
    }

    startTransition(async () => {
      const result = await saveSccgTaskAction({
        ...createData,
        status: createData.status || "backlog",
      });

      if (!result.success || !result.task) {
        alert(result.error || "Unable to create task");
        return;
      }

      setTasks((current) => [...current, result.task!]);
      setIsCreateOpen(false);
    });
  }

  function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingTask) return;
    if (!editingTask.title?.trim()) {
      alert("Please enter a task title.");
      return;
    }

    if (editingTask.taskFlow === "candidate" && !editingTask.candidateId) {
      alert("Please select a candidate for candidate tasks.");
      return;
    }

    if (editingTask.taskFlow === "partner" && !editingTask.assignedTo) {
      alert("Please select a partner to assign this task to.");
      return;
    }

    startTransition(async () => {
      const result = await saveSccgTaskAction({ ...editingTask });
      if (!result.success || !result.task) {
        alert(result.error || "Unable to save task");
        return;
      }

      setTasks((current) =>
        current.map((task) => (task.id === result.task!.id ? result.task! : task))
      );
      setEditingTask(null);
    });
  }

  function handleAddComment() {
    if (!editingTask || !commentText.trim()) return;

    startTransition(async () => {
      const result = await addTaskCommentAction(editingTask.id, commentText.trim());
      if (!result.success || !result.comment) {
        alert(result.error || "Failed to add comment");
        return;
      }

      const updatedComments = [...(editingTask.comments || []), result.comment];
      const updatedTask = { ...editingTask, comments: updatedComments };
      setEditingTask(updatedTask);
      setTasks((current) =>
        current.map((t) => (t.id === editingTask.id ? updatedTask : t))
      );
      setCommentText("");
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }

  function deleteTask(taskId: string, taskFlow?: CandidateTaskFlow) {
    if (!confirm("Are you sure you want to delete this task?")) return;
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
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
      startTransition(async () => {
        const result = await updateSccgTaskStatusAction(task.id, nextStatus);
        if (!result.success) {
          alert(result.error || "Failed to move task");
          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
        }
      });
    }
  }

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.status === targetStatus) return;

    const previousStatus = targetTask.status;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t)));

    startTransition(async () => {
      const result = await updateSccgTaskStatusAction(taskId, targetStatus);
      if (!result.success) {
        alert(result.error || "Failed to move task");
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t)));
      }
    });
  };

  // Flow counts for quick badge stats
  const flowCounts = useMemo(() => {
    return {
      all: visibleTasks.length,
      sccg: visibleTasks.filter((t) => t.taskFlow === "sccg").length,
      staff: visibleTasks.filter((t) => t.taskFlow === "staff").length,
      partner: visibleTasks.filter((t) => t.taskFlow === "partner").length,
      candidate: visibleTasks.filter((t) => t.taskFlow === "candidate").length,
    };
  }, [visibleTasks]);

  return (
    <div className="space-y-6">
      {/* Top Portal Switcher (Candidate Tasks vs DevOps Board) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-xs">
            <CheckCircle2 className="h-4 w-4" />
            Operations & Candidate Tasks
          </div>
          <Link
            href={title.toLowerCase().includes("admin") ? "/admin/dev-board" : "/sccg/dev-board"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <FolderGit2 className="h-4 w-4 text-purple-500" />
            Project Dev Board (DevOps / Jira)
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scope Toggle (All Tasks vs My Tasks) — only for admin */}
          {isAdmin && normalizedUserEmail && (
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                  scopeFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Team Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("mine")}
                className={`rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                  scopeFilter === "mine"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My Tasks
              </button>
            </div>
          )}

          {/* Search Input */}
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks, assignees..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring sm:w-56"
            />
          </label>

          {/* Priority filter */}
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Create Button */}
          <button
            onClick={() => openCreateModal()}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* Quick Flow Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
          <Filter className="h-3.5 w-3.5" /> Category:
        </span>

        <button
          type="button"
          onClick={() => setSelectedFlowFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
            selectedFlowFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          All Categories ({flowCounts.all})
        </button>

        {FLOWS.map((f) => {
          const isSelected = selectedFlowFilter === f.id;
          const count = flowCounts[f.id as keyof typeof flowCounts] || 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFlowFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label.replace("Task for ", "")} ({count})
            </button>
          );
        })}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {STATUSES.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.id);
          const isOver = dragOverCol === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`rounded-2xl border-t-4 p-3.5 min-h-[550px] flex flex-col space-y-3.5 shadow-xs transition-all ${
                column.color
              } ${isOver ? "ring-2 ring-primary ring-offset-2 bg-primary/5" : ""}`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                  <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                    {column.label}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-background/80 border border-border/40 rounded-full text-[11px] font-bold text-foreground">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/60 border border-dashed border-border/40 rounded-xl">
                    <Layers className="h-6 w-6 mb-1 opacity-40" />
                    <span className="text-[11px] font-medium">No tasks in {column.label}</span>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => { setEditingTask(task); setEditTab("details"); setCommentText(""); }}
                      onMove={(dir) => handleMoveStage(task, dir)}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                    />
                  ))
                )}

                <button
                  onClick={() => openCreateModal("sccg", column.id)}
                  className="w-full mt-2 rounded-xl border border-dashed border-border/70 py-2.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  + Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATE TASK MODAL                                                      */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <form
            onSubmit={handleCreateSubmit}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plus className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Create New Task</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select target category, assignee, and milestones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Flow Selector */}
            <Field label="Who is this task for?">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-1.5">
                {FLOWS.map((f) => {
                  const isSelected = createData.taskFlow === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setCreateData({
                          ...createData,
                          taskFlow: f.id,
                          assignedTo: "",
                          assignedToName: "",
                          assignedToEmail: "",
                        })
                      }
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-background hover:bg-muted/50 text-muted-foreground font-medium"
                      }`}
                    >
                      <span className="text-xs">{f.label.replace("Task for ", "")}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Dynamic Assignee Searchable Dropdown */}
            {createData.taskFlow === "partner" && (
              <Field label="Assign To (Partner) *">
                <SearchableCombobox
                  options={partnerOptions}
                  value={createData.assignedTo || ""}
                  onChange={(val) => {
                    const selected = partners.find((p) => p.id === val);
                    setCreateData({
                      ...createData,
                      assignedTo: selected?.id || "",
                      assignedToName: selected?.companyName || "",
                      assignedToEmail: selected?.email || "",
                    });
                  }}
                  placeholder="Search and select partner..."
                  searchPlaceholder="Type partner company name or email..."
                  emptyMessage="No matching partners found."
                  required
                />
              </Field>
            )}

            {(createData.taskFlow === "staff" || createData.taskFlow === "sccg") && (
              <Field label={createData.taskFlow === "staff" ? "Assign To (Staff Member) *" : "Assign To Staff (Optional)"}>
                <SearchableCombobox
                  options={staffOptions.filter((opt) => {
                    const b = String(opt.badge || "").toLowerCase();
                    if (createData.taskFlow === "sccg") return b === "sccg-admin" || b === "admin";
                    if (createData.taskFlow === "staff") return b === "sccg-staff";
                    return true;
                  })}
                  value={createData.assignedTo || ""}
                  onChange={(val) => {
                    const selected = staff.find((s) => s.id === val);
                    setCreateData({
                      ...createData,
                      assignedTo: selected?.id || "",
                      assignedToName: selected?.name || "",
                      assignedToEmail: selected?.email || "",
                    });
                  }}
                  placeholder="Search and select staff member..."
                  searchPlaceholder="Type staff name or email..."
                  emptyMessage="No matching staff found."
                  required={createData.taskFlow === "staff"}
                />
              </Field>
            )}

            {/* Candidate & Priority Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={createData.taskFlow === "candidate" ? "Candidate *" : "Candidate (Optional)"}>
                <SearchableCombobox
                  options={candidateOptions}
                  value={createData.candidateId || ""}
                  onChange={(val) => setCreateData({ ...createData, candidateId: val })}
                  placeholder={createData.taskFlow === "candidate" ? "Select candidate..." : "None / General Task"}
                  searchPlaceholder="Search candidate name or SCCG ID..."
                  emptyMessage="No matching candidates found."
                  required={createData.taskFlow === "candidate"}
                />
              </Field>

              <Field label="Priority">
                <select
                  value={createData.priority || "medium"}
                  onChange={(event) =>
                    setCreateData({ ...createData, priority: event.target.value as TaskPriority })
                  }
                  className="input"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Title */}
            <Field label="Task Title *">
              <input
                required
                placeholder="e.g., Collect degree certificate and translations"
                value={createData.title || ""}
                onChange={(event) => setCreateData({ ...createData, title: event.target.value })}
                className="input"
              />
            </Field>

            {/* Details / Comments */}
            <Field label="Details / Comments">
              <textarea
                rows={3}
                placeholder="Add background context, checklist, or instructions..."
                value={createData.description || ""}
                onChange={(event) => setCreateData({ ...createData, description: event.target.value })}
                className="input resize-y"
              />
            </Field>

            {/* Deadline & Initial Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Deadline / Due Date">
                <input
                  type="date"
                  value={createData.dueDate || ""}
                  onChange={(event) => setCreateData({ ...createData, dueDate: event.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Initial Column Stage">
                <select
                  value={createData.status || "backlog"}
                  onChange={(e) => setCreateData({ ...createData, status: e.target.value as TaskStatus })}
                  className="input font-medium"
                >
                  {STATUSES.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT TASK MODAL (with Comments tab)                                     */}
      {/* ========================================================================= */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col">
            {/* Header with highlighted title */}
            <div className="flex items-start justify-between border-b border-border p-5 pb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {editingTask.taskCategory || "General Task"}
                  </span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold ${PRIORITIES.find(p => p.id === editingTask.priority)?.className || ""}`}>
                    {editingTask.priority}
                  </span>
                </div>
                {/* Highlighted task title */}
                <h2 className="text-lg font-bold text-foreground bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-l-4 border-indigo-500 pl-3 py-1.5 rounded-r-lg">
                  {editingTask.title}
                </h2>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {editingTask.createdByName && <span>Created by <strong>{editingTask.createdByName}</strong></span>}
                  {editingTask.assignedToName && <span>• Assigned to <strong>{editingTask.assignedToName}</strong></span>}
                  {editingTask.dueDate && (
                    <span className="flex items-center gap-0.5">
                      • <CalendarDays className="h-3 w-3" /> {editingTask.dueDate}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer ml-2"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab switcher: Details | Comments */}
            <div className="flex border-b border-border px-5">
              <button
                type="button"
                onClick={() => setEditTab("details")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  editTab === "details"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5 inline mr-1" />
                Details & Edit
              </button>
              <button
                type="button"
                onClick={() => setEditTab("comments")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  editTab === "comments"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Comments
                {(editingTask.comments?.length || 0) > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {editingTask.comments?.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {editTab === "details" ? (
                <form onSubmit={handleEditSubmit} className="space-y-5">
                  {/* Who is this task for? */}
                  <Field label="Who is this task for?">
                    <select
                      value={editingTask.taskFlow || "sccg"}
                      onChange={(event) =>
                        setEditingTask({
                          ...editingTask,
                          taskFlow: event.target.value as CandidateTaskFlow,
                          assignedTo: "",
                          assignedToName: "",
                          assignedToEmail: "",
                        })
                      }
                      className="input font-medium"
                    >
                      {FLOWS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Assignee Searchable Dropdown */}
                  {editingTask.taskFlow === "partner" && (
                    <Field label="Assign To (Partner) *">
                      <SearchableCombobox
                        options={partnerOptions}
                        value={editingTask.assignedTo || ""}
                        onChange={(val) => {
                          const selected = partners.find((p) => p.id === val);
                          setEditingTask({
                            ...editingTask,
                            assignedTo: selected?.id || "",
                            assignedToName: selected?.companyName || "",
                            assignedToEmail: selected?.email || "",
                          });
                        }}
                        placeholder="Search and select partner..."
                        searchPlaceholder="Type partner company name or email..."
                        emptyMessage="No matching partners found."
                        required
                      />
                    </Field>
                  )}

                  {(editingTask.taskFlow === "staff" || editingTask.taskFlow === "sccg") && (
                    <Field label={editingTask.taskFlow === "staff" ? "Assign To (Staff Member) *" : "Assign To Staff (Optional)"}>
                      <SearchableCombobox
                        options={staffOptions.filter((opt) => {
                          const b = String(opt.badge || "").toLowerCase();
                          if (editingTask.taskFlow === "sccg") return b === "sccg-admin" || b === "admin";
                          if (editingTask.taskFlow === "staff") return b === "sccg-staff";
                          return true;
                        })}
                        value={editingTask.assignedTo || ""}
                        onChange={(val) => {
                          const selected = staff.find((s) => s.id === val);
                          setEditingTask({
                            ...editingTask,
                            assignedTo: selected?.id || "",
                            assignedToName: selected?.name || "",
                            assignedToEmail: selected?.email || "",
                          });
                        }}
                        placeholder="Search and select staff member..."
                        searchPlaceholder="Type staff name or email..."
                        emptyMessage="No matching staff found."
                        required={editingTask.taskFlow === "staff"}
                      />
                    </Field>
                  )}

                  {/* Candidate & Priority Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={editingTask.taskFlow === "candidate" ? "Candidate *" : "Candidate (Optional)"}>
                      <SearchableCombobox
                        options={candidateOptions}
                        value={editingTask.candidateId || ""}
                        onChange={(val) => setEditingTask({ ...editingTask, candidateId: val })}
                        placeholder={editingTask.taskFlow === "candidate" ? "Select candidate..." : "None / General Task"}
                        searchPlaceholder="Search candidate name or SCCG ID..."
                        emptyMessage="No matching candidates found."
                        required={editingTask.taskFlow === "candidate"}
                      />
                    </Field>

                    <Field label="Priority">
                      <select
                        value={editingTask.priority || "medium"}
                        onChange={(event) =>
                          setEditingTask({ ...editingTask, priority: event.target.value as TaskPriority })
                        }
                        className="input"
                      >
                        {PRIORITIES.map((priority) => (
                          <option key={priority.id} value={priority.id}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Task Title */}
                  <Field label="Task title *">
                    <input
                      required
                      value={editingTask.title || ""}
                      onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })}
                      className="input"
                    />
                  </Field>

                  {/* Details / comment */}
                  <Field label="Details / description">
                    <textarea
                      rows={3}
                      value={editingTask.description || ""}
                      onChange={(event) =>
                        setEditingTask({ ...editingTask, description: event.target.value })
                      }
                      className="input resize-y"
                    />
                  </Field>

                  {/* Deadline & Status Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Deadline">
                      <input
                        type="date"
                        value={editingTask.dueDate || ""}
                        onChange={(event) => setEditingTask({ ...editingTask, dueDate: event.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        value={editingTask.status || "todo"}
                        onChange={(event) =>
                          setEditingTask({ ...editingTask, status: event.target.value as TaskStatus })
                        }
                        className="input font-medium"
                      >
                        {STATUSES.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => deleteTask(editingTask.id, editingTask.taskFlow as CandidateTaskFlow)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Task
                    </button>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingTask(null)}
                        className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isPending}
                        type="submit"
                        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isPending ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Comments Tab */
                <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {(!editingTask.comments || editingTask.comments.length === 0) ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground/60">
                        <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
                        <p className="text-sm font-medium">No comments yet</p>
                        <p className="text-xs mt-1">Be the first to comment on this task</p>
                      </div>
                    ) : (
                      editingTask.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-3 rounded-xl border text-sm ${
                            comment.authorEmail?.toLowerCase() === normalizedUserEmail
                              ? "bg-primary/5 border-primary/20 ml-6"
                              : "bg-muted/30 border-border/60 mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {comment.authorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString("en-US", {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      ))
                    )}
                    <div ref={commentEndRef} />
                  </div>

                  {/* Comment input */}
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-end gap-2">
                      <textarea
                        rows={2}
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        className="input flex-1 resize-none"
                      />
                      <button
                        type="button"
                        disabled={isPending || !commentText.trim()}
                        onClick={handleAddComment}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                        title="Send comment (Ctrl+Enter)"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Press <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px]">Ctrl+Enter</kbd> to send • Task owner & assignee will be notified via email & Teams
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          margin-top: 0.35rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
        }
      `}</style>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onMove,
  onDragStart,
}: {
  task: CandidateTask;
  onEdit: () => void;
  onMove: (dir: "next" | "prev") => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const priority = PRIORITIES.find((item) => item.id === task.priority) || PRIORITIES[1];
  const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date(new Date().toDateString());
  const commentCount = task.comments?.length || 0;
  const creatorName = task.createdByName || (task.createdByEmail ? task.createdByEmail.split("@")[0] : "Admin");

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-card border border-border/70 p-3.5 rounded-xl space-y-2.5 shadow-xs hover:border-indigo-500/60 hover:shadow-md transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing"
    >
      <div>
        {/* Card Header with Category, Priority & Always Visible Edit Button */}
        <div className="flex justify-between items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
            {task.taskCategory || "General Task"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold ${priority.className}`}
            >
              {priority.label}
            </span>
            {/* Always-visible Edit Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
              title="Click to open task editor & comments"
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        {/* Highlighted task title */}
        <button onClick={onEdit} className="text-left w-full mt-1.5 cursor-pointer group/title">
          <h3 className="font-bold text-sm text-foreground leading-snug bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-l-3 border-indigo-500 pl-2.5 py-1 rounded-r group-hover/title:border-indigo-600 group-hover/title:from-indigo-500/20 transition-all">
            {task.title}
          </h3>
        </button>

        {/* Creator & Assignment Metadata */}
        <div className="mt-1.5 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3 text-indigo-500/80" />
            <span>Created by: <strong className="text-foreground font-semibold">{creatorName}</strong></span>
          </div>

          {task.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
              {task.description}
            </p>
          )}
        </div>

        {/* Badges for Candidate & Assignee */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {task.candidateName && (
            <div className="flex items-center space-x-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium border border-primary/20">
              <span className="truncate max-w-[140px]">👤 {task.candidateName}</span>
            </div>
          )}
          {task.assignedToName && (
            <div className="flex items-center space-x-1 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-medium border border-emerald-500/20">
              <span className="truncate max-w-[140px]">✓ {task.assignedToName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="border-t border-border/40 pt-2.5 flex justify-between items-center mt-1">
        <button
          onClick={() => onMove("prev")}
          disabled={task.status === "backlog"}
          className="text-[10px] font-semibold p-1 bg-muted/40 border border-border/40 rounded text-muted-foreground hover:bg-muted disabled:opacity-20 transition-colors cursor-pointer"
          title="Move to previous stage"
        >
          <ArrowLeft className="h-3 w-3" />
        </button>

        <div className="flex items-center gap-2">
          {commentCount > 0 ? (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold hover:bg-primary/20 transition-colors cursor-pointer"
              title={`${commentCount} comment${commentCount > 1 ? "s" : ""}`}
            >
              <MessageCircle className="h-3 w-3" />
              {commentCount}
            </button>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Add comment"
            >
              <MessageCircle className="h-3 w-3 opacity-60" />
            </button>
          )}

          {task.dueDate && (
            <span
              className={`flex items-center gap-1 text-[10px] font-medium ${
                isOverdue ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground"
              }`}
            >
              {isOverdue && <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />}
              <CalendarDays className="h-3 w-3 opacity-70" />
              {task.dueDate}
            </span>
          )}
        </div>

        <button
          onClick={() => onMove("next")}
          disabled={task.status === "done"}
          className="text-[10px] font-semibold p-1 bg-muted/40 border border-border/40 rounded text-muted-foreground hover:bg-muted disabled:opacity-20 transition-colors cursor-pointer"
          title="Move to next stage"
        >
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-foreground space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}
