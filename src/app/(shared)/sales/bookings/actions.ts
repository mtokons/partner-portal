"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getCandidates } from "@/lib/sharepoint";
import type { BookingAppointment } from "@/lib/bookings";

/**
 * Converts a Microsoft Booking appointment into a pre-filled candidate
 * registration URL (new candidate wizard) so the admin/partner can complete enrollment.
 * Returns the URL to navigate to, or an error string.
 */
export async function getConvertToLeadUrlAction(
  appointment: BookingAppointment
): Promise<{ url: string } | { error: string }> {
  const session = await getEffectiveSession();
  if (!session?.user) return { error: "Not authenticated" };

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = roles.includes("admin");

  // Check if already a candidate
  try {
    const all = await getCandidates();
    const existing = all.find(
      (c) => c.email?.toLowerCase() === appointment.customerEmailAddress?.toLowerCase()
    );
    if (existing) {
      const base = isAdmin ? "/admin/candidates" : "/partner/candidates";
      return { url: `${base}/${existing.id}` };
    }
  } catch {
    // Continue if check fails
  }

  // Build pre-fill query params for the new candidate wizard
  const params = new URLSearchParams({
    prefill: "1",
    name: appointment.customerName || "",
    email: appointment.customerEmailAddress || "",
    phone: appointment.customerPhone || "",
    notes: `Booked: ${appointment.serviceName} on ${new Date(appointment.startDateTime.dateTime + "Z").toLocaleDateString()}. ${appointment.customerNotes || ""}`.trim(),
    source: "booking",
    bookingId: appointment.id,
  });

  const base = isAdmin ? "/admin/candidates/new" : "/partner/candidates/new";
  return { url: `${base}?${params.toString()}` };
}
