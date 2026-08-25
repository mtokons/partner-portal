import "server-only";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { DevProject, DevWorkItem, DevWorkItemStatus } from "@/types/dev-project";

const PROJECTS_COLLECTION = "dev_projects";
const WORK_ITEMS_COLLECTION = "dev_work_items";

// Default starter seed project
const SEED_PROJECT: DevProject = {
  id: "proj-portal-core",
  key: "PORTAL",
  name: "SCCG Partner Portal Core Platform",
  description: "Core full-stack portal platform, dashboard systems, candidate tracking, and integrations.",
  category: "software",
  status: "active",
  leadEmail: "hasnain@mysccg.de",
  leadName: "Hasnain Admin",
  startDate: "2026-01-01",
  targetDate: "2026-12-31",
  itemCounter: 106,
  createdAt: new Date().toISOString(),
};

const SEED_WORK_ITEMS: DevWorkItem[] = [
  {
    id: "item-portal-101",
    projectKey: "PORTAL",
    itemNumber: 101,
    itemCode: "PORTAL-101",
    title: "Unified Multi-Role Task & Project DevOps Board",
    description: "Build a single unified task board architecture with support for DevOps/Jira project tracking, epics, stories, and Kanban.",
    type: "epic",
    status: "in-progress",
    priority: "urgent",
    storyPoints: 13,
    milestone: "Sprint 4",
    tags: ["frontend", "backend", "kanban", "devops"],
    assignedToName: "Hasnain Admin",
    assignedToEmail: "hasnain@mysccg.de",
    assignedToCategory: "sccg-admin",
    reporterEmail: "hasnain@mysccg.de",
    reporterName: "Hasnain Admin",
    dueDate: "2026-09-15",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-portal-102",
    projectKey: "PORTAL",
    itemNumber: 102,
    itemCode: "PORTAL-102",
    title: "Interactive Drag-and-Drop Kanban Columns",
    description: "Implement smooth HTML5 drag-and-drop between Backlog, To Do, In Progress, Review, and Done with live optimistic updates.",
    type: "feature",
    status: "done",
    priority: "high",
    storyPoints: 5,
    parentId: "item-portal-101",
    parentCode: "PORTAL-101",
    milestone: "Sprint 4",
    tags: ["ui/ux", "drag-and-drop", "react"],
    assignedToName: "Mehery Sajin",
    assignedToEmail: "meherysajin@gmail.com",
    assignedToCategory: "sccg-staff",
    reporterEmail: "hasnain@mysccg.de",
    reporterName: "Hasnain Admin",
    dueDate: "2026-08-30",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-portal-103",
    projectKey: "PORTAL",
    itemNumber: 103,
    itemCode: "PORTAL-103",
    title: "Bug: Dropdown Category Filter in Task Board Modal",
    description: "Resolve category mapping so assignee dropdown displays strictly filtered users based on target role.",
    type: "bug",
    status: "done",
    priority: "urgent",
    severity: "critical",
    storyPoints: 3,
    parentId: "item-portal-101",
    parentCode: "PORTAL-101",
    milestone: "Sprint 4",
    tags: ["bugfix", "filter", "dropdown"],
    assignedToName: "Hasnain Admin",
    assignedToEmail: "hasnain@mysccg.de",
    assignedToCategory: "sccg-admin",
    reporterEmail: "hasnain@mysccg.de",
    reporterName: "Hasnain Admin",
    dueDate: "2026-08-25",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-portal-104",
    projectKey: "PORTAL",
    itemNumber: 104,
    itemCode: "PORTAL-104",
    title: "User Story: Stakeholder Milestone Tracking & Notifications",
    description: "As a project partner or staff, I want email notifications and in-app alerts whenever work items are assigned to me.",
    type: "story",
    status: "review",
    priority: "medium",
    storyPoints: 8,
    parentId: "item-portal-101",
    parentCode: "PORTAL-101",
    milestone: "Sprint 4",
    tags: ["notifications", "email", "stakeholder"],
    assignedToName: "Fridoy Admin",
    assignedToEmail: "jfridoy@mysccg.de",
    assignedToCategory: "sccg-admin",
    reporterEmail: "hasnain@mysccg.de",
    reporterName: "Hasnain Admin",
    dueDate: "2026-09-01",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-portal-105",
    projectKey: "PORTAL",
    itemNumber: 105,
    itemCode: "PORTAL-105",
    title: "Task: Implement Story Point & Velocity Metrics",
    description: "Add sprint burndown summary cards and workload calculation per stakeholder on the DevOps board header.",
    type: "task",
    status: "todo",
    priority: "medium",
    storyPoints: 5,
    parentId: "item-portal-101",
    parentCode: "PORTAL-101",
    milestone: "Sprint 4",
    tags: ["analytics", "metrics", "sprint"],
    assignedToName: "Mehery Sajin",
    assignedToEmail: "meherysajin@gmail.com",
    assignedToCategory: "sccg-staff",
    reporterEmail: "hasnain@mysccg.de",
    reporterName: "Hasnain Admin",
    dueDate: "2026-09-05",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-portal-106",
    projectKey: "PORTAL",
    itemNumber: 106,
    itemCode: "PORTAL-106",
    title: "Improvement: Dark Mode Contrast on Work Item Cards",
    description: "Optimize badge colors, glassmorphism borders, and text contrast in dark theme.",
    type: "improvement",
    status: "backlog",
    priority: "low",
    storyPoints: 2,
    parentId: "item-portal-101",
    parentCode: "PORTAL-101",
    milestone: "Sprint 5",
    tags: ["ui/ux", "dark-mode", "styling"],
    assignedToName: "Hasnain Admin",
    assignedToEmail: "hasnain@mysccg.de",
    assignedToCategory: "sccg-admin",
    reporterEmail: "hasnain@mysccg.de",
    reporterName: "Hasnain Admin",
    dueDate: "2026-09-20",
    createdAt: new Date().toISOString(),
  },
];

export async function getDevProjects(): Promise<DevProject[]> {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection(PROJECTS_COLLECTION).get();
    if (snap.empty) {
      // Seed default project
      await db.collection(PROJECTS_COLLECTION).doc(SEED_PROJECT.id).set(SEED_PROJECT);
      return [SEED_PROJECT];
    }
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DevProject[];
  } catch (err) {
    console.warn("[dev-projects-db] getDevProjects Firestore failed, using memory seed:", err);
    return [SEED_PROJECT];
  }
}

export async function getDevProjectByKey(key: string): Promise<DevProject | null> {
  const projects = await getDevProjects();
  return projects.find((p) => p.key.toUpperCase() === key.toUpperCase()) || null;
}

export async function saveDevProject(project: Partial<DevProject>): Promise<DevProject> {
  const db = getAdminFirestore();
  const projects = await getDevProjects();
  const cleanKey = (project.key || "DEV").toUpperCase().trim().replace(/[^A-Z0-9]/g, "");

  let targetId = project.id;
  if (!targetId) {
    targetId = `proj-${cleanKey.toLowerCase()}-${Date.now().toString(36)}`;
  }

  const existing = projects.find((p) => p.id === targetId);

  const payload: DevProject = {
    id: targetId,
    key: cleanKey,
    name: project.name || "Untitled Project",
    description: project.description || "",
    category: project.category || "software",
    status: project.status || "active",
    leadEmail: project.leadEmail,
    leadName: project.leadName,
    startDate: project.startDate || new Date().toISOString().slice(0, 10),
    targetDate: project.targetDate,
    itemCounter: existing?.itemCounter ?? (project.itemCounter || 100),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.collection(PROJECTS_COLLECTION).doc(targetId).set(payload, { merge: true });
  } catch (err) {
    console.error("[dev-projects-db] saveDevProject error:", err);
  }

  return payload;
}

export async function deleteDevProject(projectId: string): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection(PROJECTS_COLLECTION).doc(projectId).delete();
  } catch (err) {
    console.error("[dev-projects-db] deleteDevProject error:", err);
  }
}

export async function getDevWorkItems(projectKey?: string): Promise<DevWorkItem[]> {
  try {
    const db = getAdminFirestore();
    let queryRef: FirebaseFirestore.Query = db.collection(WORK_ITEMS_COLLECTION);
    if (projectKey) {
      queryRef = queryRef.where("projectKey", "==", projectKey.toUpperCase());
    }
    const snap = await queryRef.get();
    if (snap.empty && (!projectKey || projectKey.toUpperCase() === "PORTAL")) {
      // Seed default work items
      const batch = db.batch();
      SEED_WORK_ITEMS.forEach((item) => {
        const docRef = db.collection(WORK_ITEMS_COLLECTION).doc(item.id);
        batch.set(docRef, item);
      });
      await batch.commit().catch(() => {});
      return SEED_WORK_ITEMS;
    }
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DevWorkItem[];
  } catch (err) {
    console.warn("[dev-projects-db] getDevWorkItems Firestore failed, returning seed:", err);
    if (!projectKey || projectKey.toUpperCase() === "PORTAL") {
      return SEED_WORK_ITEMS;
    }
    return [];
  }
}

export async function saveDevWorkItem(itemData: Partial<DevWorkItem>): Promise<DevWorkItem> {
  const db = getAdminFirestore();
  const projectKey = (itemData.projectKey || "PORTAL").toUpperCase();

  let targetId = itemData.id;
  let itemNumber = itemData.itemNumber;
  let itemCode = itemData.itemCode;

  if (!targetId) {
    targetId = `item-${projectKey.toLowerCase()}-${Date.now().toString(36)}`;
  }

  if (!itemNumber) {
    // Increment project item counter
    try {
      const projectDocRef = db.collection(PROJECTS_COLLECTION).doc(`proj-${projectKey.toLowerCase()}`);
      const projectSnap = await projectDocRef.get();
      if (projectSnap.exists) {
        const currentCounter = (projectSnap.data()?.itemCounter || 100) + 1;
        itemNumber = currentCounter;
        await projectDocRef.update({ itemCounter: currentCounter });
      } else {
        itemNumber = Math.floor(100 + Math.random() * 900);
      }
    } catch {
      itemNumber = Math.floor(100 + Math.random() * 900);
    }
  }

  if (!itemCode) {
    itemCode = `${projectKey}-${itemNumber}`;
  }

  const payload: DevWorkItem = {
    id: targetId,
    projectKey,
    itemNumber,
    itemCode,
    title: itemData.title?.trim() || "Untitled Item",
    description: itemData.description || "",
    type: itemData.type || "task",
    status: itemData.status || "backlog",
    priority: itemData.priority || "medium",
    severity: itemData.severity,
    storyPoints: itemData.storyPoints ?? (itemData.type === "epic" ? 13 : itemData.type === "story" ? 5 : itemData.type === "task" ? 3 : 1),
    parentId: itemData.parentId || undefined,
    parentCode: itemData.parentCode || undefined,
    assignedToId: itemData.assignedToId || undefined,
    assignedToName: itemData.assignedToName || undefined,
    assignedToEmail: itemData.assignedToEmail || undefined,
    assignedToCategory: itemData.assignedToCategory || undefined,
    reporterEmail: itemData.reporterEmail || undefined,
    reporterName: itemData.reporterName || undefined,
    milestone: itemData.milestone || "Sprint 1",
    tags: itemData.tags || [],
    dueDate: itemData.dueDate || undefined,
    acceptanceCriteria: itemData.acceptanceCriteria || undefined,
    resolution: itemData.resolution || undefined,
    createdAt: itemData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.collection(WORK_ITEMS_COLLECTION).doc(targetId).set(payload, { merge: true });
  } catch (err) {
    console.error("[dev-projects-db] saveDevWorkItem error:", err);
  }

  return payload;
}

export async function updateDevWorkItemStatus(
  itemId: string,
  status: DevWorkItemStatus
): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection(WORK_ITEMS_COLLECTION).doc(itemId).update({
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[dev-projects-db] updateDevWorkItemStatus error:", err);
  }
}

export async function deleteDevWorkItem(itemId: string): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection(WORK_ITEMS_COLLECTION).doc(itemId).delete();
  } catch (err) {
    console.error("[dev-projects-db] deleteDevWorkItem error:", err);
  }
}
