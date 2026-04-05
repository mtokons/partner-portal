"use server";

import { createClient, createActivity } from "@/lib/sharepoint";

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
