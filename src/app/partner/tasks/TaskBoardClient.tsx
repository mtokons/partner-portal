"use client";

import { useState, useTransition, useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, Plus, Search, CheckCircle2, 
  Trash2, X, Calendar, Tag as TagIcon,
  ChevronDown, AlertCircle, Clock, User as UserIcon,
  Edit2
} from "lucide-react";
import { 
  savePartnerTaskAction, 
  deletePartnerTaskAction, 
  movePartnerTaskAction 
} from "./actions";
import type { CandidateTask, TaskStatus, TaskPriority, CandidateTaskCategory, WorkflowCategory } from "@/types";

interface TaskBoardClientProps {
  initialTasks: CandidateTask[];
  candidates: Array<{ id: string; fullName: string; sccgId: string; email: string }>;
  partner: { id: string; name: string; email: string; partnerCode: string };
}

const COLUMNS: Array<{ id: TaskStatus; label: string; bg: string; border: string; text: string; dot: string; topBorder: string }> = [
  { id: "backlog", label: "Backlog", bg: "bg-slate-500/5", border: "border-slate-500/10", text: "text-slate-400", dot: "bg-slate-400", topBorder: "border-t-slate-500" },
  { id: "todo", label: "To Do", bg: "bg-indigo-500/5", border: "border-indigo-500/10", text: "text-indigo-400", dot: "bg-indigo-500", topBorder: "border-t-indigo-500" },
  { id: "in-progress", label: "In Progress", bg: "bg-amber-500/5", border: "border-amber-500/10", text: "text-amber-400", dot: "bg-amber-500", topBorder: "border-t-amber-500" },
  { id: "review", label: "In Review", bg: "bg-violet-500/5", border: "border-violet-500/10", text: "text-violet-400", dot: "bg-violet-500", topBorder: "border-t-violet-500" },
  { id: "done", label: "Done", bg: "bg-emerald-500/5", border: "border-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500", topBorder: "border-t-emerald-500" },
];

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const PRIORITY_THEMES = {
  low: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  medium: { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  high: { bg: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const CATEGORIES: CandidateTaskCategory[] = ["Document Required", "Payment Due", "General Task"];
const WORKFLOW_CATEGORIES: WorkflowCategory[] = ["Training & Language", "Ausbildung", "Student", "Opportunity Card", "Others"];

export default function TaskBoardClient({ initialTasks, candidates, partner }: TaskBoardClientProps) {
  const [tasks, setTasks] = useState<CandidateTask[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<CandidateTask> | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  const selectedCandidate = useMemo(() => {
    return candidates.find(c => c.id === selectedCandidateId);
  }, [candidates, selectedCandidateId]);

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(query) ||
      (task.description || "").toLowerCase().includes(query) ||
      (task.candidateName || "").toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  // Drag and Drop handlers
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

    // Optimistic update
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    const result = await movePartnerTaskAction(taskId, targetStatus);
    if (!result.success) {
      // Revert if action failed
      setTasks(previousTasks);
      alert(result.error || "Failed to move task");
    }
  };

  const handleMoveStage = async (e: React.MouseEvent, taskId: string, currentStatus: TaskStatus, direction: "next" | "prev") => {
    e.stopPropagation();
    const stageOrder: TaskStatus[] = ["backlog", "todo", "in-progress", "review", "done"];
    const idx = stageOrder.indexOf(currentStatus);
    let nextIdx = idx;
    if (direction === "next" && idx < stageOrder.length - 1) nextIdx = idx + 1;
    if (direction === "prev" && idx > 0) nextIdx = idx - 1;
    
    if (nextIdx !== idx) {
      const targetStatus = stageOrder[nextIdx];
      const previousTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

      const result = await movePartnerTaskAction(taskId, targetStatus);
      if (!result.success) {
        setTasks(previousTasks);
        alert(result.error || "Failed to move task");
      }
    }
  };

  // Open creation modal
  const handleAddTask = (status: TaskStatus) => {
    setSelectedCandidateId(candidates[0]?.id || "");
    setEditingTask({
      title: "",
      description: "",
      status,
      priority: "medium",
      taskCategory: "General Task",
      workflowCategory: "Training & Language",
      dueDate: new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEditTask = (task: CandidateTask) => {
    setSelectedCandidateId(task.candidateId);
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Save Task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !selectedCandidate) return;

    startTransition(async () => {
      // Build final task payload
      const payload = {
        ...editingTask,
        candidateId: selectedCandidate.id,
        candidateName: selectedCandidate.fullName,
      };

      const res = await savePartnerTaskAction(payload);
      if (res.success && res.task) {
        setTasks(prev => {
          const index = prev.findIndex(t => t.id === res.task.id);
          if (index > -1) {
            return prev.map(t => t.id === res.task.id ? res.task : t);
          } else {
            return [...prev, res.task];
          }
        });
        setIsModalOpen(false);
        setEditingTask(null);
      } else {
        alert(res.error || "Failed to save task");
      }
    });
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    startTransition(async () => {
      const res = await deletePartnerTaskAction(taskId);
      if (res.success) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setIsModalOpen(false);
        setEditingTask(null);
      } else {
        alert(res.error || "Failed to delete task");
      }
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Partner Task Board
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage, assign, and track operations for candidate milestones.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks, candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={() => handleAddTask("backlog")}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                "rounded-2xl border-x border-b border-t-4 transition-all duration-300 flex flex-col max-h-[750px]",
                col.bg,
                col.topBorder,
                isOver ? "border-primary/50 ring-2 ring-primary/10 scale-[1.01]" : col.border
              )}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="font-bold text-foreground text-sm tracking-wide">{col.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted/80 text-foreground font-semibold">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards Container */}
              <div className="p-3 space-y-3 overflow-y-auto min-h-[150px] scrollbar-thin">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <p className="text-xs">No tasks here</p>
                    <button
                      onClick={() => handleAddTask(col.id)}
                      className="text-xs text-primary font-medium hover:underline mt-1 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Create task
                    </button>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const theme = PRIORITY_THEMES[task.priority] || PRIORITY_THEMES.medium;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => handleEditTask(task)}
                        className="group/card bg-card/60 hover:bg-card border border-white/5 hover:border-primary/30 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing relative"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-foreground text-sm leading-tight group-hover/card:text-primary transition-colors truncate">
                            {task.title}
                          </h4>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 uppercase", theme.bg)}>
                            {task.priority}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-muted-foreground text-xs line-clamp-2 mb-3 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-muted-foreground/80 font-medium">
                            {task.taskCategory}
                          </span>
                          {task.workflowCategory && (
                            <span className="text-[10px] bg-primary/5 border border-primary/10 px-2 py-0.5 rounded text-primary/80 font-medium">
                              {task.workflowCategory}
                            </span>
                          )}
                        </div>

                        {/* Candidate Scope */}
                        {task.candidateName && (
                          <div className="border-t border-white/5 pt-2 mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="truncate max-w-[120px] font-medium text-foreground/70">
                              👤 {task.candidateName}
                            </span>
                            {task.dueDate && (
                              <span className="shrink-0 flex items-center gap-1 text-xs">
                                <Clock className="w-3 h-3 opacity-60" />
                                {task.dueDate}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Assignee Indicator */}
                        {task.assignedToName && (
                          <div className="mt-2 flex items-center justify-end">
                            <span 
                              title={`Assigned to: ${task.assignedToName}`} 
                              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                            >
                              ✓ Assig: {task.assignedToName.split(" ")[0]}
                            </span>
                          </div>
                        )}

                        {/* Kanban Arrow Move Buttons */}
                        <div className="border-t border-white/5 pt-3 mt-3 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleMoveStage(e, task.id, task.status, "prev")}
                            disabled={task.status === "backlog"}
                            className="text-[10px] font-semibold px-2 py-1 bg-muted/40 border border-border/50 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            ◀
                          </button>
                          <button 
                            onClick={(e) => handleMoveStage(e, task.id, task.status, "next")}
                            disabled={task.status === "done"}
                            className="text-[10px] font-semibold px-2 py-1 bg-muted/40 border border-border/50 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation / Edit Modal */}
      {isModalOpen && editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveTask}
            className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                {editingTask.id ? "Edit Task" : "Create Backlog Task"}
              </h3>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingTask(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate selection */}
            {!editingTask.id && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Candidate *</label>
                <div className="relative">
                  <select
                    required
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.sccgId || "No Code"})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Title *</label>
              <input
                type="text"
                required
                placeholder="milestone description, document request, etc."
                value={editingTask.title || ""}
                onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <textarea
                placeholder="provide details or action items..."
                rows={3}
                value={editingTask.description || ""}
                onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>

            {/* Grid for parameters */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Priority</label>
                <div className="relative">
                  <select
                    value={editingTask.priority || "medium"}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                    className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Due date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={editingTask.dueDate || ""}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Category</label>
                <div className="relative">
                  <select
                    value={editingTask.taskCategory || "General Task"}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, taskCategory: e.target.value as CandidateTaskCategory }))}
                    className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Workflow Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Workflow Category</label>
                <div className="relative">
                  <select
                    value={editingTask.workflowCategory || "Training & Language"}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, workflowCategory: e.target.value as WorkflowCategory }))}
                    className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    {WORKFLOW_CATEGORIES.map(wc => (
                      <option key={wc} value={wc}>{wc}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Assignee selection */}
            {selectedCandidate && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assignee</label>
                <div className="relative">
                  <select
                    value={editingTask.assignedTo || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setEditingTask(prev => ({
                          ...prev,
                          assignedTo: "",
                          assignedToName: "",
                          assignedToEmail: "",
                        }));
                      } else if (val === partner.id) {
                        setEditingTask(prev => ({
                          ...prev,
                          assignedTo: partner.id,
                          assignedToName: partner.name,
                          assignedToEmail: partner.email,
                        }));
                      } else {
                        setEditingTask(prev => ({
                          ...prev,
                          assignedTo: selectedCandidate.id,
                          assignedToName: selectedCandidate.fullName,
                          assignedToEmail: selectedCandidate.email,
                        }));
                      }
                    }}
                    className="w-full bg-muted/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    <option value={partner.id}>Partner: {partner.name} (You)</option>
                    <option value={selectedCandidate.id}>Candidate: {selectedCandidate.fullName}</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Note: Assigned permissions are restricted to the partner owner or the task's corresponding candidate.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-6">
              {editingTask.id ? (
                <button
                  type="button"
                  onClick={() => handleDeleteTask(editingTask.id!)}
                  disabled={isPending}
                  className="flex items-center gap-1 text-red-500 hover:text-red-400 font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Task
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingTask(null); }}
                  className="px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-70"
                >
                  {isPending ? "Saving..." : editingTask.id ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
