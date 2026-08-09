"use server";

import { revalidatePath } from "next/cache";
import { requireSccgAccess } from "@/lib/admin-guard";
import { getSuccessStories, createSuccessStory, deleteSuccessStory } from "@/lib/sharepoint";
import type { SuccessStory } from "@/types";

export async function getSuccessStoriesAction(): Promise<SuccessStory[]> {
  await requireSccgAccess();
  return getSuccessStories();
}

export async function createSuccessStoryAction(data: {
  name: string;
  profession: string;
  service: string;
  story?: string;
  photoBase64?: string;
  photoName?: string;
  photoType?: string;
}): Promise<{ success: boolean; story?: SuccessStory; error?: string }> {
  try {
    const user = await requireSccgAccess();
    if (!data.name?.trim() || !data.profession?.trim() || !data.service?.trim()) {
      return { success: false, error: "Name, profession and service are required" };
    }

    let photoUrl: string | undefined;
    if (data.photoBase64 && data.photoName) {
      try {
        const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
        const client = await getGraphClient();
        const siteId = await resolveSiteId();
        const ext = data.photoName.split(".").pop() || "jpg";
        const safe = data.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = `${safe}_${Date.now()}.${ext}`;
        const uploadUrl = `/sites/${siteId}/drive/root:/SuccessStories/${fileName}:/content`;
        const buffer = Buffer.from(data.photoBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
        const res = await client
          .api(uploadUrl)
          .header("Content-Type", data.photoType || "image/jpeg")
          .put(buffer);
        photoUrl = res?.webUrl;
      } catch (e) {
        console.error("[success-story] photo upload failed:", e);
      }
    }

    const story = await createSuccessStory({
      name: data.name.trim(),
      profession: data.profession.trim(),
      service: data.service.trim(),
      story: data.story?.trim() || undefined,
      photoUrl,
      isPublished: true,
      createdBy: user.email || user.id,
      createdAt: new Date().toISOString(),
    });

    revalidatePath("/sccg/candidates/successful");
    return { success: true, story };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create success story" };
  }
}

export async function deleteSuccessStoryAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSccgAccess();
    await deleteSuccessStory(id);
    revalidatePath("/sccg/candidates/successful");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete success story" };
  }
}
