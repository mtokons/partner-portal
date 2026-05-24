import { redirect } from "next/navigation";

// Admin dashboard — redirects to overview for now
export default function AdminDashboardPage() {
  redirect("/admin/overview");
}
