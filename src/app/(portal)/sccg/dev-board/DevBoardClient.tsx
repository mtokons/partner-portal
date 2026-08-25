"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Kanban,
  ListTree,
  Bug,
  BarChart3,
  Plus,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  Clock,
  CalendarDays,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Tag,
  ArrowRight,
  ArrowLeft,
  X,
  Trash2,
  Edit2,
  FolderGit2,
  Sparkles,
  ExternalLink,
  Target,
  FileCode,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type {
  DevProject,
  DevWorkItem,
  DevWorkItemType,
  DevWorkItemStatus,
  DevWorkItemPriority,
  DevWorkItemSeverity,
} from "@/types/dev-project";
import {
  saveDevProjectAction,
  saveDevWorkItemAction,
  updateDevWorkItemStatusAction,
  deleteDevWorkItemAction,
  deleteDevProjectAction,
} from "./actions";

// Work item type metadata (colors, icons, badges)
export const WORK_ITEM_TYPES: Record<
  DevWorkItemType,
  { label: string; icon: string; bg: string; text: string; border: string; desc: string }
> = {
  epic: {
    label: "Epic",
    icon: "🟣",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    desc: "Major high-level initiative or overarching theme",
  },
  feature: {
    label: "Feature",
    icon: "🔵",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    desc: "System capability or functional module",
  },
  story: {
    label: "User Story",
    icon: "🟢",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    desc: "End-user functionality or business requirement",
  },
  task: {
    label: "Task",
    icon: "🟡",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    desc: "Technical implementation, maintenance, or operation",
  },
  bug: {
    label: "Bug / Error",
    icon: "🔴",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    desc: "Defect, error, regression, or crash report",
  },
  improvement: {
    label: "Improvement",
    icon: "🟠",
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/30",
    desc: "Refactoring, UI/UX polish, or performance tuning",
  },
};

export const WORK_ITEM_STATUSES: Array<{
  id: DevWorkItemStatus;
  label: string;
  dot: string;
  color: string;
}> = [
  { id: "backlog", label: "Backlog", dot: "bg-slate-400", color: "border-t-slate-500 bg-slate-500/5" },
  { id: "todo", label: "To Do", dot: "bg-indigo-500", color: "border-t-indigo-500 bg-indigo-500/5" },
  { id: "in-progress", label: "In Progress", dot: "bg-amber-500", color: "border-t-amber-500 bg-amber-500/5" },
  { id: "review", label: "In Review / QA", dot: "bg-violet-500", color: "border-t-violet-500 bg-violet-500/5" },
  { id: "done", label: "Done", dot: "bg-emerald-500", color: "border-t-emerald-500 bg-emerald-500/5" },
];

export const PRIORITIES: Array<{ id: DevWorkItemPriority; label: string; className: string }> = [
  { id: "urgent", label: "Urgent / Blocker", className: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30" },
  { id: "high", label: "High", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30" },
  { id: "medium", label: "Medium", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30" },
  { id: "low", label: "Low", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
];

export const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  category: string;
  company?: string;
}

interface DevBoardClientProps {
  initialProjects: DevProject[];
  initialActiveProjectKey: string;
  initialWorkItems: DevWorkItem[];
  users: AssignableUser[];
  currentUserEmail?: string;
  baseTasksPath?: string;
}

export default function DevBoardClient({
  initialProjects,
  initialActiveProjectKey,
  initialWorkItems,
  users,
  currentUserEmail = "",
  baseTasksPath = "/sccg/tasks",
}: DevBoardClientProps) {
  const [projects, setProjects] = useState<DevProject[]>(initialProjects);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(initialActiveProjectKey || "PORTAL");
  const [workItems, setWorkItems] = useState<DevWorkItem[]>(initialWorkItems);

  // Active View Tab: "kanban" | "backlog" | "bugs" | "analytics"
  const [activeTab, setActiveTab] = useState<"kanban" | "backlog" | "bugs" | "analytics">("kanban");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("all");
  const [selectedMilestoneFilter, setSelectedMilestoneFilter] = useState<string>("all");
  const [myItemsOnly, setMyItemsOnly] = useState(false);

  // Drag-and-drop state
  const [dragOverCol, setDragOverCol] = useState<DevWorkItemStatus | null>(null);

  // Modal States
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DevWorkItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Form State
  const [createItemData, setCreateItemData] = useState<Partial<DevWorkItem>>({
    title: "",
    description: "",
    type: "task",
    status: "backlog",
    priority: "medium",
    storyPoints: 3,
    milestone: "Sprint 1",
    tags: [],
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const [createProjectData, setCreateProjectData] = useState<Partial<DevProject>>({
    name: "",
    key: "",
    description: "",
    category: "software",
    status: "active",
  });

  const [tagInput, setTagInput] = useState("");

  const activeProject = useMemo(() => {
    return projects.find((p) => p.key.toUpperCase() === selectedProjectKey.toUpperCase()) || projects[0];
  }, [projects, selectedProjectKey]);

  // Unique milestones for filter
  const milestones = useMemo(() => {
    const set = new Set<string>();
    workItems.forEach((i) => {
      if (i.milestone) set.add(i.milestone);
    });
    return Array.from(set);
  }, [workItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return workItems.filter((item) => {
      // 1. Project Filter
      if (activeProject && item.projectKey.toUpperCase() !== activeProject.key.toUpperCase()) {
        return false;
      }

      // 2. My Items Filter
      if (myItemsOnly && currentUserEmail) {
        if ((item.assignedToEmail || "").toLowerCase() !== currentUserEmail.toLowerCase()) {
          return false;
        }
      }

      // 3. Type Filter
      if (selectedTypeFilter !== "all" && item.type !== selectedTypeFilter) {
        return false;
      }

      // 4. Priority Filter
      if (selectedPriorityFilter !== "all" && item.priority !== selectedPriorityFilter) {
        return false;
      }

      // 5. Assignee Filter
      if (selectedAssigneeFilter !== "all" && item.assignedToEmail !== selectedAssigneeFilter) {
        return false;
      }

      // 6. Milestone Filter
      if (selectedMilestoneFilter !== "all" && item.milestone !== selectedMilestoneFilter) {
        return false;
      }

      // 7. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = [
          item.itemCode,
          item.title,
          item.description,
          item.assignedToName,
          item.milestone,
          ...(item.tags || []),
        ].some((val) => val && val.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [
    workItems,
    activeProject,
    myItemsOnly,
    currentUserEmail,
    selectedTypeFilter,
    selectedPriorityFilter,
    selectedAssigneeFilter,
    selectedMilestoneFilter,
    searchQuery,
  ]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = filteredItems.length;
    const done = filteredItems.filter((i) => i.status === "done").length;
    const inProgress = filteredItems.filter((i) => i.status === "in-progress" || i.status === "review").length;
    const bugs = filteredItems.filter((i) => i.type === "bug" && i.status !== "done").length;
    const totalPoints = filteredItems.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const completedPoints = filteredItems
      .filter((i) => i.status === "done")
      .reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const progressPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

    return {
      total,
      done,
      inProgress,
      bugs,
      totalPoints,
      completedPoints,
      progressPercent,
    };
  }, [filteredItems]);

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragOver = (e: React.DragEvent, colId: DevWorkItemStatus) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: DevWorkItemStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;

    const targetItem = workItems.find((i) => i.id === itemId);
    if (!targetItem || targetItem.status === targetStatus) return;

    const previousStatus = targetItem.status;

    // Optimistic UI Update
    setWorkItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: targetStatus } : i)));

    startTransition(async () => {
      const res = await updateDevWorkItemStatusAction(itemId, targetStatus);
      if (!res.success) {
        alert(res.error || "Failed to update item status");
        setWorkItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: previousStatus } : i)));
      }
    });
  };

  const handleMoveStage = (item: DevWorkItem, direction: "next" | "prev") => {
    const order: DevWorkItemStatus[] = ["backlog", "todo", "in-progress", "review", "done"];
    const idx = order.indexOf(item.status);
    let nextIdx = idx;
    if (direction === "next" && idx < order.length - 1) nextIdx = idx + 1;
    if (direction === "prev" && idx > 0) nextIdx = idx - 1;

    if (nextIdx !== idx) {
      const nextStatus = order[nextIdx];
      setWorkItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)));

      startTransition(async () => {
        const res = await updateDevWorkItemStatusAction(item.id, nextStatus);
        if (!res.success) {
          alert(res.error || "Failed to move stage");
          setWorkItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)));
        }
      });
    }
  };

  // Open Create Item modal with defaults
  const openCreateItemModal = (defaultType: DevWorkItemType = "task", defaultStatus: DevWorkItemStatus = "backlog", parentItem?: DevWorkItem) => {
    setCreateItemData({
      projectKey: activeProject?.key || "PORTAL",
      title: "",
      description: "",
      type: defaultType,
      status: defaultStatus,
      priority: "medium",
      storyPoints: defaultType === "epic" ? 13 : defaultType === "story" ? 5 : defaultType === "task" ? 3 : 1,
      parentId: parentItem?.id || undefined,
      parentCode: parentItem?.itemCode || undefined,
      milestone: "Sprint 1",
      tags: [],
      dueDate: new Date().toISOString().slice(0, 10),
    });
    setTagInput("");
    setIsCreateItemOpen(true);
  };

  // Create Item Submission
  const handleCreateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createItemData.title?.trim()) {
      alert("Please enter a title for the work item.");
      return;
    }

    startTransition(async () => {
      const res = await saveDevWorkItemAction({
        ...createItemData,
        projectKey: activeProject?.key || "PORTAL",
      });

      if (!res.success || !res.item) {
        alert(res.error || "Failed to create work item");
        return;
      }

      setWorkItems((prev) => [...prev, res.item!]);
      setIsCreateItemOpen(false);
    });
  };

  // Edit Item Submission
  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title?.trim()) return;

    startTransition(async () => {
      const res = await saveDevWorkItemAction(editingItem);
      if (!res.success || !res.item) {
        alert(res.error || "Failed to save changes");
        return;
      }

      setWorkItems((prev) => prev.map((i) => (i.id === res.item!.id ? res.item! : i)));
      setEditingItem(null);
    });
  };

  // Delete Item
  const handleDeleteItem = (itemId: string) => {
    if (!confirm("Are you sure you want to delete this work item?")) return;
    startTransition(async () => {
      const res = await deleteDevWorkItemAction(itemId);
      if (!res.success) {
        alert(res.error || "Failed to delete item");
        return;
      }
      setWorkItems((prev) => prev.filter((i) => i.id !== itemId));
      setEditingItem(null);
    });
  };

  // Create Project Submission
  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createProjectData.name?.trim() || !createProjectData.key?.trim()) {
      alert("Please provide a project name and key (e.g. 'PORTAL').");
      return;
    }

    startTransition(async () => {
      const res = await saveDevProjectAction(createProjectData);
      if (!res.success || !res.project) {
        alert(res.error || "Failed to create project");
        return;
      }

      setProjects((prev) => [...prev, res.project!]);
      setSelectedProjectKey(res.project!.key);
      setIsCreateProjectOpen(false);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Portal Switcher (Candidate Tasks vs DevOps Board) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Link
            href={baseTasksPath}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Operations & Candidate Tasks
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-xs">
            <FolderGit2 className="h-4 w-4" />
            Project Dev Board (DevOps / Jira)
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectKey}
            onChange={(e) => setSelectedProjectKey(e.target.value)}
            className="h-8.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.key}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setCreateProjectData({
                name: "",
                key: "",
                description: "",
                category: "software",
                status: "active",
              });
              setIsCreateProjectOpen(true);
            }}
            className="inline-flex h-8.5 items-center gap-1 px-2.5 rounded-lg border border-dashed border-border bg-muted/30 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
            title="Create New Project"
          >
            <Plus className="h-3.5 w-3.5" /> Project
          </button>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-card to-card/60 p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              {activeProject?.key || "DEV"}
            </span>
            <h1 className="text-xl font-bold text-foreground">{activeProject?.name || "Development Board"}</h1>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            {activeProject?.description || "Manage development lifecycle, features, user stories, tasks, bugs, and release sprints."}
          </p>
        </div>

        {/* Quick View Switcher & Create Item Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "kanban"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban Board
            </button>
            <button
              onClick={() => setActiveTab("backlog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "backlog"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListTree className="h-3.5 w-3.5" /> Backlog Tree
            </button>
            <button
              onClick={() => setActiveTab("bugs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "bugs"
                  ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bug className="h-3.5 w-3.5" /> Bug Tracker ({metrics.bugs})
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Sprint Velocity
            </button>
          </div>

          <button
            onClick={() => openCreateItemModal("task", "backlog")}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Work Item
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-card border border-border/70 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Total Work Items</span>
          <p className="text-lg font-bold text-foreground mt-0.5">{metrics.total}</p>
        </div>
        <div className="p-3 bg-card border border-border/70 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Story Points Velocity</span>
          <p className="text-lg font-bold text-primary mt-0.5">
            {metrics.completedPoints} <span className="text-xs font-normal text-muted-foreground">/ {metrics.totalPoints} pts</span>
          </p>
        </div>
        <div className="p-3 bg-card border border-border/70 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Sprint Progress</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-muted/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">{metrics.progressPercent}%</span>
          </div>
        </div>
        <div className="p-3 bg-card border border-border/70 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">In Progress / Review</span>
          <p className="text-lg font-bold text-amber-500 mt-0.5">{metrics.inProgress}</p>
        </div>
        <div className="p-3 bg-card border border-border/70 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Completed (Done)</span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.done}</p>
        </div>
        <div className="p-3 bg-card border border-border/70 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Active Bugs / Errors</span>
          <p className="text-lg font-bold text-red-500 mt-0.5">{metrics.bugs}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 p-3 rounded-xl border border-border/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <label className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, tag..."
              className="h-8.5 w-44 sm:w-56 rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          {/* Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            {Object.entries(WORK_ITEM_TYPES).map(([type, meta]) => (
              <option key={type} value={type}>
                {meta.icon} {meta.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssigneeFilter}
            onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
            className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary max-w-[160px]"
          >
            <option value="all">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.email}>
                {u.name} ({u.category})
              </option>
            ))}
          </select>

          {/* Milestone Filter */}
          {milestones.length > 0 && (
            <select
              value={selectedMilestoneFilter}
              onChange={(e) => setSelectedMilestoneFilter(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Sprints / Milestones</option>
              {milestones.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* My Tasks toggle button */}
        {currentUserEmail && (
          <button
            type="button"
            onClick={() => setMyItemsOnly(!myItemsOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              myItemsOnly
                ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" /> Assigned to Me
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: KANBAN BOARD VIEW                                                */}
      {/* ========================================================================= */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {WORK_ITEM_STATUSES.map((column) => {
            const columnItems = filteredItems.filter((i) => i.status === column.id);
            const isOver = dragOverCol === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`rounded-2xl border-t-4 p-3.5 min-h-[550px] flex flex-col space-y-3 shadow-xs transition-all ${
                  column.color
                } ${isOver ? "ring-2 ring-primary ring-offset-2 bg-primary/5" : ""}`}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                    <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                      {column.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-background/80 border border-border/40 rounded-full text-[11px] font-bold text-foreground">
                    {columnItems.length}
                  </span>
                </div>

                {/* Column Items list */}
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                  {columnItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground/60 border border-dashed border-border/40 rounded-xl">
                      <Layers className="h-5 w-5 mb-1 opacity-30" />
                      <span className="text-[11px] font-medium">No items</span>
                    </div>
                  ) : (
                    columnItems.map((item) => (
                      <DevWorkItemCard
                        key={item.id}
                        item={item}
                        onEdit={() => setEditingItem(item)}
                        onMove={(dir) => handleMoveStage(item, dir)}
                        onDragStart={(e) => handleDragStart(e, item.id)}
                      />
                    ))
                  )}

                  <button
                    onClick={() => openCreateItemModal("task", column.id)}
                    className="w-full mt-2 rounded-xl border border-dashed border-border/70 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    + Add work item
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: BACKLOG & HIERARCHY TREE VIEW                                     */}
      {/* ========================================================================= */}
      {activeTab === "backlog" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ListTree className="h-5 w-5 text-primary" /> Backlog Hierarchy & Feature Epics
              </h2>
              <p className="text-xs text-muted-foreground">
                Grouped hierarchy of Epics, Features, User Stories, and child implementation tasks.
              </p>
            </div>
            <button
              onClick={() => openCreateItemModal("epic", "backlog")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold shadow hover:bg-purple-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> New Epic
            </button>
          </div>

          <div className="space-y-4">
            {/* Render Epics first */}
            {filteredItems.filter((i) => i.type === "epic").length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                <p className="text-xs">No Epics defined in this project. Create an Epic to group user stories and features.</p>
              </div>
            )}

            {filteredItems
              .filter((i) => i.type === "epic")
              .map((epic) => {
                const childItems = filteredItems.filter((i) => i.parentId === epic.id);
                return (
                  <div key={epic.id} className="border border-purple-500/30 rounded-xl overflow-hidden bg-purple-500/5">
                    <div className="flex items-center justify-between p-3.5 bg-purple-500/10 border-b border-purple-500/20">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{WORK_ITEM_TYPES.epic.icon}</span>
                        <span className="font-extrabold text-xs text-purple-700 dark:text-purple-300">
                          {epic.itemCode}
                        </span>
                        <h3 className="font-bold text-sm text-foreground">{epic.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-background/80 border border-border text-foreground">
                          {epic.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                          {epic.storyPoints || 0} pts
                        </span>
                        <button
                          onClick={() => openCreateItemModal("story", "backlog", epic)}
                          className="px-2 py-1 rounded bg-background border border-border text-[11px] font-medium text-foreground hover:bg-muted cursor-pointer"
                        >
                          + Add Story
                        </button>
                        <button
                          onClick={() => setEditingItem(epic)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Child items */}
                    <div className="p-3 space-y-2">
                      {childItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-2">No child stories or tasks attached yet.</p>
                      ) : (
                        childItems.map((child) => {
                          const typeMeta = WORK_ITEM_TYPES[child.type];
                          return (
                            <div
                              key={child.id}
                              className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <span>{typeMeta.icon}</span>
                                <span className="font-bold text-xs text-muted-foreground">{child.itemCode}</span>
                                <span className="font-medium text-xs text-foreground">{child.title}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-muted text-muted-foreground">
                                  {child.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {child.assignedToName && (
                                  <span className="text-[11px] text-muted-foreground">👤 {child.assignedToName}</span>
                                )}
                                <span className="text-[11px] font-bold text-primary">{child.storyPoints || 0} pts</span>
                                <button
                                  onClick={() => setEditingItem(child)}
                                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Edit
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

            {/* Standalone unparented items */}
            <div className="border border-border rounded-xl p-4 space-y-2.5 bg-muted/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Standalone & Other Work Items
              </h4>
              {filteredItems
                .filter((i) => i.type !== "epic" && (!i.parentId || !workItems.some((w) => w.id === i.parentId)))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{WORK_ITEM_TYPES[item.type].icon}</span>
                      <span className="font-bold text-xs text-muted-foreground">{item.itemCode}</span>
                      <span className="font-medium text-xs text-foreground">{item.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-muted text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.assignedToName && (
                        <span className="text-[11px] text-muted-foreground">👤 {item.assignedToName}</span>
                      )}
                      <span className="text-[11px] font-bold text-primary">{item.storyPoints || 0} pts</span>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: BUG & ERROR TRACKER                                              */}
      {/* ========================================================================= */}
      {activeTab === "bugs" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Bug className="h-5 w-5 text-red-500" /> Defect, Bug & Incident Management
              </h2>
              <p className="text-xs text-muted-foreground">
                Track regressions, error reports, critical fixes, and verification statuses.
              </p>
            </div>
            <button
              onClick={() => openCreateItemModal("bug", "backlog")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold shadow hover:bg-red-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Report Bug
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold">
                  <th className="py-2.5 px-3">Key</th>
                  <th className="py-2.5 px-3">Summary</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredItems.filter((i) => i.type === "bug").length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      🎉 No bugs found! Everything is operating cleanly.
                    </td>
                  </tr>
                ) : (
                  filteredItems
                    .filter((i) => i.type === "bug")
                    .map((bug) => (
                      <tr key={bug.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 font-bold text-red-600 dark:text-red-400">{bug.itemCode}</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setEditingItem(bug)}
                            className="font-semibold text-foreground hover:underline text-left"
                          >
                            {bug.title}
                          </button>
                          {bug.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{bug.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              bug.severity === "blocker" || bug.severity === "critical"
                                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                                : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            }`}
                          >
                            {bug.severity || "major"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize font-semibold text-foreground">{bug.priority}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              bug.status === "done"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : bug.status === "in-progress" || bug.status === "review"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {bug.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{bug.assignedToName || "Unassigned"}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setEditingItem(bug)}
                            className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-[11px] font-semibold text-foreground cursor-pointer"
                          >
                            Resolve
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: SPRINT VELOCITY & ANALYTICS                                      */}
      {/* ========================================================================= */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Workload by Team & Stakeholders
            </h3>
            <div className="space-y-3">
              {users.map((u) => {
                const userItems = filteredItems.filter((i) => i.assignedToEmail === u.email);
                const userPoints = userItems.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
                if (userItems.length === 0) return null;
                return (
                  <div key={u.id} className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{u.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-primary/10 text-primary">
                          {u.category}
                        </span>
                      </div>
                      <span className="font-bold text-foreground">
                        {userItems.length} items ({userPoints} pts)
                      </span>
                    </div>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((userPoints / (metrics.totalPoints || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" /> Work Items Distribution by Type
            </h3>
            <div className="space-y-2.5">
              {Object.entries(WORK_ITEM_TYPES).map(([type, meta]) => {
                const count = filteredItems.filter((i) => i.type === type).length;
                const points = filteredItems
                  .filter((i) => i.type === type)
                  .reduce((sum, i) => sum + (i.storyPoints || 0), 0);
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                return (
                  <div key={type} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card">
                    <div className="flex items-center gap-2 text-xs">
                      <span>{meta.icon}</span>
                      <span className="font-bold text-foreground">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{count} items ({points} pts)</span>
                      <span className="font-bold text-foreground w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE WORK ITEM MODAL                                          */}
      {/* ========================================================================= */}
      {isCreateItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <form
            onSubmit={handleCreateItemSubmit}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">New Work Item ({activeProject?.key})</h2>
                <p className="text-xs text-muted-foreground">
                  Create an epic, feature, story, development task, or error ticket.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateItemOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Work Item Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(WORK_ITEM_TYPES).map(([t, meta]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setCreateItemData({
                        ...createItemData,
                        type: t as DevWorkItemType,
                        storyPoints: t === "epic" ? 13 : t === "story" ? 5 : t === "task" ? 3 : 1,
                      })
                    }
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      createItemData.type === t
                        ? "border-primary bg-primary/10 font-bold shadow-xs"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-[10px] mt-0.5">{meta.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Title *</label>
              <input
                required
                placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
                value={createItemData.title || ""}
                onChange={(e) => setCreateItemData({ ...createItemData, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Details / Description</label>
              <textarea
                rows={3}
                placeholder="Technical specifications, reproduction steps, or acceptance criteria..."
                value={createItemData.description || ""}
                onChange={(e) => setCreateItemData({ ...createItemData, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>

            {/* Row: Priority, Story Points, Milestone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                <select
                  value={createItemData.priority || "medium"}
                  onChange={(e) => setCreateItemData({ ...createItemData, priority: e.target.value as DevWorkItemPriority })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Story Points</label>
                <select
                  value={createItemData.storyPoints || 3}
                  onChange={(e) => setCreateItemData({ ...createItemData, storyPoints: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-bold"
                >
                  {STORY_POINT_OPTIONS.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt} points
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Sprint / Milestone</label>
                <input
                  placeholder="e.g. Sprint 4"
                  value={createItemData.milestone || ""}
                  onChange={(e) => setCreateItemData({ ...createItemData, milestone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
            </div>

            {/* Assignee Selection */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Assignee</label>
              <select
                value={createItemData.assignedToEmail || ""}
                onChange={(e) => {
                  const selected = users.find((u) => u.email === e.target.value);
                  setCreateItemData({
                    ...createItemData,
                    assignedToId: selected?.id || "",
                    assignedToName: selected?.name || "",
                    assignedToEmail: selected?.email || "",
                    assignedToCategory: selected?.category || "",
                  });
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} — {u.email} ({u.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date & Initial Column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={createItemData.dueDate || ""}
                  onChange={(e) => setCreateItemData({ ...createItemData, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Initial Stage</label>
                <select
                  value={createItemData.status || "backlog"}
                  onChange={(e) => setCreateItemData({ ...createItemData, status: e.target.value as DevWorkItemStatus })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-bold"
                >
                  {WORK_ITEM_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreateItemOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Creating..." : "Create Work Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT WORK ITEM MODAL                                            */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <form
            onSubmit={handleEditItemSubmit}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{WORK_ITEM_TYPES[editingItem.type].icon}</span>
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    {editingItem.itemCode} · Edit Item
                  </h2>
                  <p className="text-xs text-muted-foreground">Update requirements, assignees, or resolve status.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Title *</label>
              <input
                required
                value={editingItem.title || ""}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Description & Acceptance Criteria</label>
              <textarea
                rows={3}
                value={editingItem.description || ""}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Stage Status</label>
                <select
                  value={editingItem.status}
                  onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as DevWorkItemStatus })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-bold"
                >
                  {WORK_ITEM_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                <select
                  value={editingItem.priority}
                  onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as DevWorkItemPriority })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Story Points</label>
                <select
                  value={editingItem.storyPoints || 3}
                  onChange={(e) => setEditingItem({ ...editingItem, storyPoints: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-bold"
                >
                  {STORY_POINT_OPTIONS.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt} points
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Assignee</label>
              <select
                value={editingItem.assignedToEmail || ""}
                onChange={(e) => {
                  const selected = users.find((u) => u.email === e.target.value);
                  setEditingItem({
                    ...editingItem,
                    assignedToId: selected?.id || "",
                    assignedToName: selected?.name || "",
                    assignedToEmail: selected?.email || "",
                    assignedToCategory: selected?.category || "",
                  });
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} — {u.email} ({u.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date & Milestone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Deadline / Due Date</label>
                <input
                  type="date"
                  value={editingItem.dueDate || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Sprint / Milestone</label>
                <input
                  value={editingItem.milestone || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, milestone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => handleDeleteItem(editingItem.id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-destructive hover:underline cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Item
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE PROJECT MODAL                                            */}
      {/* ========================================================================= */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <form
            onSubmit={handleCreateProjectSubmit}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Create New Development Project</h2>
                <p className="text-xs text-muted-foreground">Setup project key and workspace parameters.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Project Name *</label>
              <input
                required
                placeholder="e.g. AI CV Tailor Engine V2"
                value={createProjectData.name || ""}
                onChange={(e) => setCreateProjectData({ ...createProjectData, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Issue Key (2-6 letters) *</label>
                <input
                  required
                  maxLength={6}
                  placeholder="e.g. AICV"
                  value={createProjectData.key || ""}
                  onChange={(e) => setCreateProjectData({ ...createProjectData, key: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-bold text-foreground uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
                <select
                  value={createProjectData.category || "software"}
                  onChange={(e) => setCreateProjectData({ ...createProjectData, category: e.target.value as any })}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground"
                >
                  <option value="software">Software / Platform</option>
                  <option value="infrastructure">Infrastructure / DevOps</option>
                  <option value="marketing">Marketing Campaign</option>
                  <option value="operations">Operations & HR</option>
                  <option value="client">Client Development</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Project scope and goals..."
                value={createProjectData.description || ""}
                onChange={(e) => setCreateProjectData({ ...createProjectData, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground resize-y"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(false)}
                className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Creating..." : "Save Project"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Work item Kanban card component
function DevWorkItemCard({
  item,
  onEdit,
  onMove,
  onDragStart,
}: {
  item: DevWorkItem;
  onEdit: () => void;
  onMove: (dir: "next" | "prev") => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const typeMeta = WORK_ITEM_TYPES[item.type] || WORK_ITEM_TYPES.task;
  const priorityMeta = PRIORITIES.find((p) => p.id === item.priority) || PRIORITIES[2];
  const isOverdue = item.dueDate && item.status !== "done" && new Date(item.dueDate) < new Date(new Date().toDateString());

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-card border border-border/70 p-3.5 rounded-xl space-y-2.5 shadow-2xs hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing"
    >
      <div>
        {/* Top Key + Type Icon + Priority */}
        <div className="flex justify-between items-start gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{typeMeta.icon}</span>
            <span className="font-extrabold text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
              {item.itemCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${priorityMeta.className}`}>
              {priorityMeta.label.split(" ")[0]}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">
              {item.storyPoints || 0}pt
            </span>
          </div>
        </div>

        {/* Title */}
        <button onClick={onEdit} className="text-left w-full hover:opacity-80 mt-1 cursor-pointer">
          <h4 className="font-bold text-xs text-foreground leading-snug line-clamp-2">{item.title}</h4>
        </button>

        {/* Parent Code reference if child item */}
        {item.parentCode && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
            <span>↳ {item.parentCode}</span>
          </div>
        )}

        {/* Assignee & Milestone Tags */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {item.assignedToName && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              👤 {item.assignedToName.split(" ")[0]}
            </span>
          )}
          {item.milestone && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              🏁 {item.milestone}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Stage Move Navigation + Due Date */}
      <div className="border-t border-border/40 pt-2 flex justify-between items-center mt-1">
        <button
          onClick={() => onMove("prev")}
          disabled={item.status === "backlog"}
          className="p-1 rounded bg-muted/40 border border-border/40 text-muted-foreground hover:bg-muted disabled:opacity-20 transition-colors cursor-pointer"
          title="Move back"
        >
          <ArrowLeft className="h-3 w-3" />
        </button>

        {item.dueDate && (
          <span
            className={`flex items-center gap-1 text-[10px] font-medium ${
              isOverdue ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground"
            }`}
          >
            {isOverdue && <AlertTriangle className="h-3 w-3 text-red-600" />}
            <CalendarDays className="h-3 w-3 opacity-60" />
            {item.dueDate}
          </span>
        )}

        <button
          onClick={() => onMove("next")}
          disabled={item.status === "done"}
          className="p-1 rounded bg-muted/40 border border-border/40 text-muted-foreground hover:bg-muted disabled:opacity-20 transition-colors cursor-pointer"
          title="Move forward"
        >
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
