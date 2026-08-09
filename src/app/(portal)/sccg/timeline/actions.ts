"use server";

import { requirePermission } from "@/lib/permissions";
import { Repository } from "@/lib/repository";
import type { CustomerPackage, Session } from "@/types";

export interface TimelineCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export async function fetchTimelineCustomersAction(): Promise<{
  success: boolean;
  data?: TimelineCustomer[];
  error?: string;
}> {
  try {
    await requirePermission("session.view.all");
    const customers = await Repository.customers.getAll();
    return {
      success: true,
      data: customers.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone || "", company: c.company })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load customers" };
  }
}

export async function fetchCustomerTimelineAction(customerId: string): Promise<{
  success: boolean;
  data?: { packages: (CustomerPackage & { sessions: Session[] })[] };
  error?: string;
}> {
  try {
    await requirePermission("session.view.all");
    const packages = await Repository.purchases.getAll(customerId);
    const withSessions = await Promise.all(
      packages.map(async (pkg) => ({ ...pkg, sessions: await Repository.sessions.getByPackage(pkg.id) }))
    );
    return { success: true, data: { packages: withSessions } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load timeline" };
  }
}
