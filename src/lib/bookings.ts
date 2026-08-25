/**
 * Microsoft Bookings integration via Microsoft Graph API
 * Required app permissions: BookingsAppointment.ReadWrite.All
 * Business: SCCGFreeConsultation@studyandcareercoachgermany.com
 */

export const BOOKINGS_BUSINESS_ID = "SCCGFreeConsultation@studyandcareercoachgermany.com";

export const BOOKINGS_URL =
  "https://bookings.cloud.microsoft/book/SCCGFreeConsultation@studyandcareercoachgermany.com/?ismsaljsauthenabled=true";

export interface BookingAppointment {
  id: string;
  customerName: string;
  customerEmailAddress: string;
  customerPhone?: string;
  customerNotes?: string;
  serviceName: string;
  serviceId?: string;
  startDateTime: { dateTime: string; timeZone: string };
  endDateTime: { dateTime: string; timeZone: string };
  staffMemberIds?: string[];
  isLocationOnline?: boolean;
  joinWebUrl?: string;
  additionalInformation?: string;
  status?: string;
}

export interface BookingCustomer {
  id: string;
  displayName: string;
  emailAddress: string;
  phone?: string;
}

export interface BookingService {
  id: string;
  displayName: string;
  description?: string;
  duration?: string;
}

interface GraphBookingsAppointmentsResponse {
  value: BookingAppointment[];
}

interface GraphBookingServicesResponse {
  value: BookingService[];
}

export interface BookingsResult {
  appointments: BookingAppointment[];
  error: "permission" | "not_found" | "unknown" | null;
}

/**
 * Fetch all appointments from the SCCG Free Consultation booking business.
 * Returns a result object distinguishing permission errors from empty results.
 */
export async function getBookingAppointments(): Promise<BookingsResult> {
  try {
    const client = await import("./graph").then((m) => m.getGraphClient());
    const res = await client
      .api(`/solutions/bookingBusinesses/${encodeURIComponent(BOOKINGS_BUSINESS_ID)}/appointments`)
      .header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly")
      .get() as { value?: BookingAppointment[] };

    const appointments = (res?.value ?? []).sort((a, b) => {
      const aDate = new Date(a.startDateTime.dateTime).getTime();
      const bDate = new Date(b.startDateTime.dateTime).getTime();
      return bDate - aDate;
    });
    return { appointments, error: null };
  } catch (err: any) {
    const code = err?.code ?? err?.statusCode ?? "";
    const msg = (err?.message ?? "").toLowerCase();
    if (
      code === 403 || code === "Forbidden" || code === "AuthorizationRequestDenied" ||
      msg.includes("forbidden") || msg.includes("authorization") || msg.includes("permission")
    ) {
      return { appointments: [], error: "permission" };
    }
    if (code === 404 || code === "itemNotFound" || msg.includes("not found")) {
      return { appointments: [], error: "not_found" };
    }
    console.error("[Bookings] Error fetching appointments:", err?.message ?? err);
    return { appointments: [], error: "unknown" };
  }
}

/**
 * Fetch services defined in the booking business.
 */
export async function getBookingServices(): Promise<BookingService[]> {
  try {
    const client = await import("./graph").then((m) => m.getGraphClient());
    const res = await client
      .api(`/solutions/bookingBusinesses/${encodeURIComponent(BOOKINGS_BUSINESS_ID)}/services`)
      .get() as { value?: BookingService[] };
    return res?.value ?? [];
  } catch {
    return [];
  }
}

/**
 * Parse ISO datetime string from Graph API (no timezone offset) to a JS Date.
 */
export function parseBookingDate(dt: { dateTime: string; timeZone: string }): Date {
  // Graph returns "2026-05-25T10:00:00.0000000" without 'Z' — treat as UTC
  return new Date(dt.dateTime.endsWith("Z") ? dt.dateTime : dt.dateTime + "Z");
}
