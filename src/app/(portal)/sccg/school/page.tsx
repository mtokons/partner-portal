import Link from "next/link";
import { Award, BookOpen, GraduationCap, Layers, Users } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { getSchoolBatches, getSchoolCertificates, getSchoolCourses, getSchoolEnrollments } from "@/lib/firestore-services";

export default async function SccgSchoolPage() {
  await requirePermission("school.report");
  const [courses, batches, enrollments, certificates] = await Promise.all([getSchoolCourses(), getSchoolBatches(), getSchoolEnrollments(), getSchoolCertificates()]);
  const metrics = [{ label: "Courses", value: courses.length, href: "/sccg/school/courses", icon: BookOpen }, { label: "Active Batches", value: batches.filter((batch) => ["active", "in-progress", "enrollment-open"].includes(batch.status)).length, href: "/sccg/school/batches", icon: Layers }, { label: "Enrollments", value: enrollments.length, href: "/sccg/school/enrollments", icon: Users }, { label: "Certificates", value: certificates.filter((certificate) => certificate.status === "issued").length, href: "/sccg/school/certificates", icon: Award }];
  return <div className="space-y-6 max-w-7xl mx-auto"><div className="flex items-center gap-3"><GraduationCap className="w-6 h-6 text-primary" /><div><h1 className="text-2xl font-bold">Language School</h1><p className="text-sm text-muted-foreground">Courses, cohorts, students and credentials</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, href, icon: Icon }) => <Link key={label} href={href} className="border rounded-lg p-5 bg-card hover:border-primary"><Icon className="w-5 h-5 text-primary mb-4" /><p className="text-3xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></Link>)}</div></div>;
}