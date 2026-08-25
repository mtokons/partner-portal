export type DevWorkItemType = "epic" | "feature" | "story" | "task" | "bug" | "improvement";

export type DevWorkItemStatus = "backlog" | "todo" | "in-progress" | "review" | "done";

export type DevWorkItemPriority = "urgent" | "high" | "medium" | "low";

export type DevWorkItemSeverity = "blocker" | "critical" | "major" | "minor";

export type DevProjectCategory = "software" | "infrastructure" | "marketing" | "operations" | "client";

export type DevProjectStatus = "planning" | "active" | "on-hold" | "completed" | "archived";

export interface DevProject {
  id: string;
  key: string; // e.g. "PORTAL", "AICV", "CORE"
  name: string;
  description?: string;
  category: DevProjectCategory;
  status: DevProjectStatus;
  leadEmail?: string;
  leadName?: string;
  startDate?: string;
  targetDate?: string;
  itemCounter?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DevWorkItem {
  id: string;
  projectKey: string;
  itemNumber: number; // e.g. 101 -> key is "PORTAL-101"
  itemCode: string; // "PORTAL-101"
  title: string;
  description?: string;
  type: DevWorkItemType;
  status: DevWorkItemStatus;
  priority: DevWorkItemPriority;
  severity?: DevWorkItemSeverity;
  storyPoints?: number; // 1, 2, 3, 5, 8, 13, 21
  parentId?: string; // e.g. Story belongs to Feature, Task belongs to Story
  parentCode?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToCategory?: string; // "sccg-admin" | "sccg-staff" | "partner" | "candidate"
  reporterEmail?: string;
  reporterName?: string;
  milestone?: string; // e.g. "Sprint 1", "Release 2.4", "Q3 Milestone"
  tags: string[]; // ["frontend", "api", "auth", "ui/ux"]
  dueDate?: string;
  acceptanceCriteria?: string;
  resolution?: string;
  createdAt: string;
  updatedAt?: string;
}
