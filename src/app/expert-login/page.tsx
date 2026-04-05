import { redirect } from "next/navigation";

export default function ExpertLoginPage() {
  // Redirect legacy expert login URL to unified login page
  redirect("/login?portal=expert");
}
