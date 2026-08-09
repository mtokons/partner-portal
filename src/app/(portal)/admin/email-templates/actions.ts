"use server";

import { requirePermission } from "@/lib/permissions";
import { Repository } from "@/lib/repository";
import type { EmailTemplate } from "@/types";

export async function fetchEmailTemplatesAction(): Promise<{ success: boolean; data?: EmailTemplate[]; error?: string }> {
  try {
    await requirePermission("admin.access");
    const templates = await Repository.emailTemplates.getAll();
    return { success: true, data: templates };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load templates" };
  }
}

export async function createEmailTemplateAction(data: Omit<EmailTemplate, "id">): Promise<{ success: boolean; data?: EmailTemplate; error?: string }> {
  try {
    await requirePermission("admin.access");
    const created = await Repository.emailTemplates.create(data);
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create template" };
  }
}

export async function updateEmailTemplateAction(id: string, data: Partial<EmailTemplate>): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("admin.access");
    await Repository.emailTemplates.update(id, data);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update template" };
  }
}

export async function deleteEmailTemplateAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("admin.access");
    await Repository.emailTemplates.delete(id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete template" };
  }
}
