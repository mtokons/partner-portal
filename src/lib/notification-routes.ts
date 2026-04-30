import type { AppNotification } from "@/types";

export type AudienceRole = "customer" | "expert" | "partner" | "admin";

/**
 * Map a notification to the most relevant in-app destination for a given audience.
 * Pure function — easy to unit-test. Defaults to the user's notifications page if
 * we can't infer a more specific target.
 */
export function notificationHref(n: AppNotification, audience: AudienceRole): string {
  const id = n.relatedId;
  switch (n.type) {
    case "payment_due":
    case "payment_received":
      if (audience === "customer") return id ? `/customer/payments` : `/customer/payments`;
      if (audience === "expert") return `/expert/payments`;
      return `/admin/payments`;
    case "session_scheduled":
    case "session_completed":
    case "session_reminder":
      if (audience === "customer") return `/customer/sessions`;
      if (audience === "expert") return `/expert/sessions`;
      return `/admin/sessions`;
    case "expert_assigned":
      if (audience === "customer") return `/customer/sessions`;
      return `/expert/sessions`;
    case "payment_eligible":
    case "payment_approved":
      if (audience === "expert") return `/expert/payments`;
      return `/admin/expert-payments`;
    case "general":
    default:
      // Best-effort: route by relatedId convention if we can spot it.
      if (id?.startsWith("ord")) {
        if (audience === "customer") return `/customer/invoices`;
        return `/admin/orders`;
      }
      if (id?.startsWith("off")) return `/sales`;
      if (audience === "customer") return `/customer/notifications`;
      if (audience === "expert") return `/expert/notifications`;
      if (audience === "partner") return `/dashboard`;
      return `/admin/overview`;
  }
}
