"use server";

import { revalidatePath } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { Repository } from "@/lib/repository";
import { KanbanTask } from "@/types";
import { assertAdmin } from "@/lib/admin-guard";

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export async function fetchTaskBoardDataAction() {
  try {
    await assertAdmin();

    // Fetch tasks (Repository) and members (Firestore) independently
    const tasksPromise = Repository.tasks.getAll().catch((e: any) => {
      console.error("[task-board] getKanbanTasks failed:", e?.message || e);
      return [] as KanbanTask[];
    });

    const membersPromise = (async () => {
      try {
        const db = getAdminFirestore();
        const snapshot = await db.collection("users").get();
        return snapshot.docs.map((doc, i) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.displayName || d.name || "Unknown User",
            role: d.role || "member",
            color: COLORS[i % COLORS.length],
            initials: getInitials(d.displayName || d.name || "U"),
            email: d.email,
            avatar: d.avatarUrl,
          };
        });
      } catch (e: any) {
        console.error("[task-board] members fetch failed:", e?.message || e);
        return [] as Array<Record<string, unknown>>;
      }
    })();

    const [tasks, members] = await Promise.all([tasksPromise, membersPromise]);

    return {
      success: true,
      data: { tasks, members },
      meta: { taskCount: tasks.length, memberCount: members.length },
    };
  } catch (error: any) {
    console.error("Fetch task board data error:", error);
    return { success: false, error: error.message || "Failed to load board data" };
  }
}

export async function saveTaskAction(taskData: any) {
  try {
    await assertAdmin();
    let saved;
    if (taskData.id && !taskData.id.startsWith("new-")) {
      saved = await Repository.tasks.update(taskData.id, taskData);
    } else {
      const { id, ...rest } = taskData;
      saved = await Repository.tasks.create(rest);
    }
    
    revalidatePath("/admin/tasks");
    return { success: true, task: saved };
  } catch (error: any) {
    console.error("Save task error:", error);
    return { success: false, error: error.message || "Failed to save task" };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    await assertAdmin();
    await Repository.tasks.delete(taskId);
    revalidatePath("/admin/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Delete task error:", error);
    return { success: false, error: error.message || "Failed to delete task" };
  }
}

export async function moveTaskAction(taskId: string, newStatus: string) {
  try {
    await assertAdmin();
    await Repository.tasks.update(taskId, { status: newStatus as any });
    revalidatePath("/admin/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Move task error:", error);
    return { success: false, error: error.message || "Failed to move task" };
  }
}

export async function refreshTaskBoardAction() {
  try {
    await assertAdmin();
    revalidatePath("/admin/tasks");
    const { getSharePointConnectionInfo } = await import("@/lib/sharepoint");
    const connection = await getSharePointConnectionInfo();
    return { success: true, connection };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
