"use server";

import { revalidatePath } from "next/cache";
import { getAllUserProfiles, updateUserProfileRoles } from "@/lib/sharepoint";
import type { UserRoleType } from "@/types";

export async function fetchAllUsersAction() {
  try {
    const users = await getAllUserProfiles();
    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch users" };
  }
}

export async function updateUserRolesAction(userId: string, roles: UserRoleType[]) {
  try {
    await updateUserProfileRoles(userId, roles);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update roles" };
  }
}
