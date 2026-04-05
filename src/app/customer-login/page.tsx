import { redirect } from "next/navigation";

export default function CustomerLoginPage() {
  // Redirect legacy customer login URL to the unified login page with portal hint
  redirect("/login?portal=customer");
}
