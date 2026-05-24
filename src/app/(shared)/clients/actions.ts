"use server";

import { createClient, createActivity, updateClient, deleteClient } from "@/lib/sharepoint";

interface AddClientInput {
  partnerId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
}

export async function addClientAction(input: AddClientInput) {
  const client = await createClient({
    partnerId: input.partnerId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    address: input.address,
    createdAt: new Date().toISOString(),
  });

  await createActivity({
    partnerId: input.partnerId,
    type: "client",
    description: `New client "${client.name}" added`,
    relatedId: client.id,
    createdAt: new Date().toISOString(),
  });

  return client;
}

export async function refreshClientsAction() {
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/clients");
  return { success: true };
}

export async function removeClient(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteClient(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete client" };
  }
}

export async function toggleClientHold(id: string, hold: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateClient(id, { isOnHold: hold });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update hold state" };
  }
}

export async function updateClientAction(id: string, data: Partial<AddClientInput>) {
  try {
    await updateClient(id, data);
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update client" };
  }
}
