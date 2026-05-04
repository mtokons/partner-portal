import { deleteOrder, toggleOrderHold as spToggleOrderHold } from "@/lib/sharepoint";

export async function removeOrder(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteOrder(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete order" };
  }
}

export async function toggleOrderHold(id: string, hold: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await spToggleOrderHold(id, hold);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update hold state" };
  }
}