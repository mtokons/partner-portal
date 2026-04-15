"use server";

import { revalidatePath } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { 
  getKanbanTasks, 
  createKanbanTask, 
  updateKanbanTask, 
  deleteKanbanTask 
} from "@/lib/sharepoint";
import { KanbanTask } from "@/types";

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
    // 1. Fetch Users from Firebase
    const db = getAdminFirestore();
    const snapshot = await db.collection("users").get();
    
    const members = snapshot.docs.map((doc, i) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.displayName || "Unknown User",
        role: d.role || "member",
        color: COLORS[i % COLORS.length],
        initials: getInitials(d.displayName || "U"),
        email: d.email,
        avatar: d.avatarUrl, // if available
      };
    });

    // 2. Fetch Tasks from SharePoint
    const tasks = await getKanbanTasks();

    return { 
      success: true, 
      data: { 
        tasks, 
        members 
      } 
    };
  } catch (error: any) {
    console.error("Fetch task board data error:", error);
    return { success: false, error: error.message || "Failed to load board data" };
  }
}

export async function saveTaskAction(taskData: any) {
  try {
    let saved;
    if (taskData.id && !taskData.id.startsWith("new-")) {
      saved = await updateKanbanTask(taskData.id, taskData);
    } else {
      const { id, ...rest } = taskData;
      saved = await createKanbanTask(rest);
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
    await deleteKanbanTask(taskId);
    revalidatePath("/admin/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Delete task error:", error);
    return { success: false, error: error.message || "Failed to delete task" };
  }
}

export async function moveTaskAction(taskId: string, newStatus: string) {
  try {
    await updateKanbanTask(taskId, { status: newStatus as any });
    revalidatePath("/admin/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Move task error:", error);
    return { success: false, error: error.message || "Failed to move task" };
  }
}
