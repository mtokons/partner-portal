"use server";

import {
  getSchoolCourses, createSchoolCourse, updateSchoolCourse, getSchoolCourseById, deleteSchoolCourse,
  getSchoolBatches, createSchoolBatch, updateSchoolBatch, getSchoolBatchById, deleteSchoolBatch,
  getSchoolEnrollments, createSchoolEnrollment, updateSchoolEnrollment, getSchoolEnrollmentById, deleteSchoolEnrollment, assignBatchToEnrollment,
  getSchoolContent, createSchoolContent, updateSchoolContent, deleteSchoolContent,
  getSchoolAttendance, recordAttendanceBatch,
  getSchoolExamResults, createSchoolExamResult, updateSchoolExamResult, publishExamResults,
  getSchoolCertificates, createSchoolCertificate, revokeSchoolCertificate, getSchoolCertificateById,
  generateInstallmentSchedule,
  getSchoolStudents,
  getSchoolTeachers, getSchoolTeacherById, createSchoolTeacher, updateSchoolTeacher, deleteSchoolTeacher,
  getTeacherEarnings, createTeacherEarning, updateTeacherEarning,
} from "@/lib/firestore-services";
import { requirePermission } from "@/lib/permissions";
import type { 
  SchoolCourse, SchoolBatch, SchoolEnrollment, SchoolCertificate, 
  SchoolTeacher, TeacherEarning, CertificateType, SchoolAttendance,
  CourseLanguage, CourseLevel, CourseStatus, BatchStatus,
  SchoolStudentStatus, ContentType, ExamType
} from "@/types";
import { writeAuditLog } from "@/lib/audit-log";
import {
  sendEmailViaGraph,
  buildEnrollmentConfirmationEmail,
  buildCertificateEmail,
  buildResultsPublishedEmail,
} from "@/lib/email";
import { revalidatePath } from "next/cache";
import { generateSccgId } from "@/lib/sccg-id";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { createCertificate as mirrorCertificateToSharePoint, getProducts, createProduct } from "@/lib/sharepoint";
import type { Product } from "@/types";

// ── Language Products as Courses ──

export async function fetchLanguageProducts(): Promise<Product[]> {
  await requirePermission("school.course.create");
  const products = await getProducts();
  // Filter to language/school related products
  return products.filter((p) => {
    const cat = (p.category || "").toLowerCase();
    const tags = (p.tags || []).map((t) => t.toLowerCase());
    return (
      cat.includes("language") ||
      cat.includes("school") ||
      cat.includes("course") ||
      tags.includes("language") ||
      tags.includes("school") ||
      tags.includes("german") ||
      tags.includes("english") ||
      tags.includes("japanese")
    );
  });
}

export async function createLanguageCourseAction(data: {
  name: string;
  sku: string;
  description: string;
  level: string;           // e.g. A1, A2, B1 — stored in sku / tags
  sessionsCount: number;
  retailPriceEur: number;
  retailPriceBdt: number;
  isAvailable: boolean;
}): Promise<Product> {
  const user = await requirePermission("school.course.create");

  const product = await createProduct({
    name: data.name,
    sku: data.sku || `LANG-${data.level}-${Date.now()}`,
    description: data.description,
    unit: "Course",
    sessionsCount: data.sessionsCount,
    retailPriceEur: data.retailPriceEur,
    retailPriceBdt: data.retailPriceBdt,
    price: data.retailPriceEur,
    stock: 999,
    category: "Training & Language",
    isAvailable: data.isAvailable,
    tags: ["language", "school", data.level.toLowerCase()].filter(Boolean),
    sortOrder: 0,
    initialPayment: 0,
    imageUrl: "",
    discount: 0,
    discountType: "fixed",
    discountExpiry: "",
  });

  await writeAuditLog({
    action: "school.course.created",
    actorId: user.id,
    actorEmail: user.email,
    targetId: product.id,
    targetType: "product",
    after: { name: data.name, sku: product.sku, category: "Training & Language" },
  });

  revalidatePath("/admin/school/courses");
  return product;
}

// ── Courses ──

export async function fetchCourses(status?: string) {
  await requirePermission("school.course.create");
  return getSchoolCourses(status);
}

export async function fetchCourseById(id: string) {
  await requirePermission("school.course.create");
  return getSchoolCourseById(id);
}

export async function createCourse(data: {
  courseName: string;
  courseCode: string;
  language: CourseLanguage;
  level: CourseLevel;
  description: string;
  totalSessions: number;
  sessionDurationMinutes: number;
  totalDurationWeeks: number;
  courseFee: number;
  courseFeeCurrency: "BDT" | "EUR";
  maxStudentsPerBatch: number;
  prerequisites?: string;
}) {
  const user = await requirePermission("school.course.create");
  const isTeacher = (user.roles || []).includes("teacher") && !(user.roles || []).includes("admin") && !(user.roles || []).includes("school-manager");

  const course = await createSchoolCourse({
    ...data,
    status: isTeacher ? "draft" : "published", // Teachers create drafts
    createdBy: user.id,
  });

  await writeAuditLog({
    action: "school.course.created",
    actorId: user.id,
    actorEmail: user.email,
    targetId: course.id,
    targetType: "school-course",
    after: { courseName: course.courseName, courseCode: course.courseCode, status: course.status },
  });

  revalidatePath("/admin/school/courses");
  return course;
}

export async function updateCourse(id: string, data: Partial<SchoolCourse>) {
  const user = await requirePermission("school.course.publish"); // Requires higher privs to edit
  await updateSchoolCourse(id, data);

  await writeAuditLog({
    action: "school.course.updated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-course",
    after: data,
  });

  revalidatePath("/admin/school/courses");
  revalidatePath(`/admin/school/courses/${id}`);
}

export async function deleteCourse(id: string) {
  const user = await requirePermission("school.course.publish");
  await deleteSchoolCourse(id);

  await writeAuditLog({
    action: "school.course.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-course",
  });

  revalidatePath("/admin/school/courses");
}

export async function publishCourse(id: string) {
  const user = await requirePermission("school.course.publish");
  await updateSchoolCourse(id, { status: "published" });

  await writeAuditLog({
    action: "school.course.published",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-course",
  });
  
  revalidatePath("/admin/school/courses");
}

// ── Batches ──

export async function fetchBatches(filters?: { courseId?: string; status?: string; teacherId?: string }) {
  await requirePermission("school.batch.manage");
  return getSchoolBatches(filters);
}

export async function fetchBatchById(id: string) {
  await requirePermission("school.batch.manage");
  return getSchoolBatchById(id);
}

export async function createBatch(data: {
  courseId: string;
  courseName: string;
  batchCode: string;
  batchName: string;
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  schedule: string;
  maxStudents: number;
  classroomOrLink?: string;
  notes?: string;
}) {
  const user = await requirePermission("school.batch.create");

  const batch = await createSchoolBatch({
    ...data,
    status: "planned",
    createdBy: user.id,
  });

  await writeAuditLog({
    action: "school.batch.created",
    actorId: user.id,
    actorEmail: user.email,
    targetId: batch.id,
    targetType: "school-batch",
    after: { batchCode: batch.batchCode, courseName: data.courseName },
  });

  revalidatePath("/admin/school/batches");
  return batch;
}

export async function updateBatch(id: string, data: Partial<SchoolBatch>) {
  const user = await requirePermission("school.batch.manage");
  await updateSchoolBatch(id, data);

  await writeAuditLog({
    action: "school.batch.updated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-batch",
    after: data,
  });

  revalidatePath("/admin/school/batches");
  revalidatePath(`/admin/school/batches/${id}`);
}

export async function deleteBatch(id: string) {
  const user = await requirePermission("school.batch.manage");
  await deleteSchoolBatch(id);

  await writeAuditLog({
    action: "school.batch.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-batch",
  });

  revalidatePath("/admin/school/batches");
}

export async function updateBatchStatus(id: string, status: BatchStatus) {
  const user = await requirePermission("school.batch.manage");
  await updateSchoolBatch(id, { status });

  await writeAuditLog({
    action: "school.batch.status.changed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-batch",
    after: { status },
  });
  
  // Auto-calculate teacher earnings when batch is completed
  if (status === "completed" || status === "results-published") {
    try {
      await calculateBatchTeacherEarningsAction(id);
    } catch (err) {
      console.error("Failed to calculate teacher earnings for batch:", id, err);
    }
  }

  revalidatePath("/admin/school/batches");
}

export async function fetchAvailableBatches() {
  await requirePermission("school.batch.manage");
  const allBatches = await getSchoolBatches();
  const batches = allBatches.filter(b =>
    ["planned", "enrollment-open", "in-progress", "active"].includes(b.status)
  );

  // Try SharePoint products first (source of truth for fees)
  let products: import("@/types").Product[] = [];
  try {
    products = await fetchLanguageProducts();
  } catch { /* fall through to Firestore */ }

  // Also get Firestore courses as fallback
  const firestoreCourses = await getSchoolCourses();

  return batches.map(b => {
    // 1. Match by courseId against SharePoint products
    const product = products.find(p => p.id === b.courseId);
    if (product) {
      const hasEur = (product.retailPriceEur || 0) > 0;
      return {
        ...b,
        courseFee: hasEur ? product.retailPriceEur : (product.retailPriceBdt || 0),
        courseFeeCurrency: hasEur ? "EUR" : "BDT",
        courseName: product.name || b.courseName,
      };
    }
    // 2. Fallback: Firestore schoolCourses
    const course = firestoreCourses.find(c => c.id === b.courseId);
    return {
      ...b,
      courseFee: course?.courseFee || 0,
      courseFeeCurrency: course?.courseFeeCurrency || "EUR",
      courseName: course?.courseName || b.courseName,
    };
  });
}

// ── Enrollments ──

export async function fetchEnrollments(filters?: { batchId?: string; courseId?: string; studentUserId?: string; status?: string }) {
  await requirePermission("school.enrollment.manage");
  return getSchoolEnrollments(filters);
}

export async function fetchEnrollmentById(id: string) {
  await requirePermission("school.enrollment.manage");
  return getSchoolEnrollmentById(id);
}

export async function enrollStudent(data: {
  // Source
  enrollmentSource?: "direct" | "partner" | "referral" | "new-student";
  // Student
  studentUserId?: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  isNewStudent?: boolean;
  // Partner sale
  partnerId?: string;
  partnerName?: string;
  // Individual referral
  referrerId?: string;
  referrerName?: string;
  referrerEmail?: string;
  referrerCommissionPercent?: number;
  // Batch (optional — can be assigned later)
  batchId?: string;
  batchCode?: string;
  courseId?: string;
  courseName?: string;
  // Fee
  totalFee: number;
  discountAmount?: number;
  discountReason?: string;
}) {
  const adminUser = await requirePermission("school.enrollment.create");
  let finalStudentUserId = data.studentUserId;

  // 1. Handle New Student Registration (create Firebase Auth + send credentials)
  if (data.isNewStudent || data.enrollmentSource === "new-student" || !finalStudentUserId) {
    const db = getAdminFirestore();
    const sccgId = await generateSccgId("USR");
    
    // Check if user already exists by email
    const existingUser = await db.collection("users").where("email", "==", data.studentEmail).limit(1).get();
    if (!existingUser.empty) {
      finalStudentUserId = existingUser.docs[0].id;
    } else {
      const newUserDoc = {
        name: data.studentName,
        email: data.studentEmail,
        phone: data.studentPhone || "",
        role: "student",
        roles: ["student"],
        sccgId,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await db.collection("users").add(newUserDoc);
      finalStudentUserId = ref.id;

      // Create Firebase Auth user and send login credentials
      if (data.enrollmentSource === "new-student" || data.isNewStudent) {
        const { getAdminApp } = await import("@/lib/firebase-admin");
        const adminApp = getAdminApp();
        const firebaseAuth = adminApp ? (await import("firebase-admin")).auth(adminApp) : null;
        if (firebaseAuth) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
          const tempPassword = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
          try {
            await firebaseAuth.createUser({
              uid: finalStudentUserId,
              email: data.studentEmail,
              displayName: data.studentName,
              password: tempPassword,
              emailVerified: false,
            });
            // Send login credentials via email
            await sendEmailViaGraph({
              to: data.studentEmail,
              subject: "Welcome to SCCG Language School – Your Login Details",
              htmlBody: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
                <h2 style="color:#6366f1">Welcome to SCCG Language School!</h2>
                <p>Dear ${data.studentName},</p>
                <p>Your student account has been created. Here are your login credentials:</p>
                <div style="background:#f5f3ff;border-left:4px solid #6366f1;padding:16px;border-radius:8px;margin:16px 0">
                  <p><strong>Portal URL:</strong> <a href="https://portal.mysccg.de">portal.mysccg.de</a></p>
                  <p><strong>Email:</strong> ${data.studentEmail}</p>
                  <p><strong>Temporary Password:</strong> <code style="font-size:16px;letter-spacing:2px">${tempPassword}</code></p>
                </div>
                <p>Please log in and change your password immediately.</p>
                <p>Best regards,<br/>SCCG Language School Team</p>
              </div>`,
            });
          } catch (authErr) {
            console.error("Failed to create Firebase Auth user for student:", authErr);
          }
        }
      }
    }
  }

  if (!finalStudentUserId) throw new Error("Could not determine Student User ID");

  const discountAmount = data.discountAmount || 0;
  const netFee = data.totalFee - discountAmount;
  const source = data.enrollmentSource || (data.isNewStudent ? "new-student" : "direct");
  const batchId = data.batchId || "";
  const batchCode = data.batchCode || "";
  const courseId = data.courseId || "";
  const courseName = data.courseName || "";
  const isBatchConfirmed = !!(data.batchId && data.batchId !== "");

  // Calculate referrer commission
  const referrerCommissionAmount = data.referrerCommissionPercent
    ? Math.round((netFee * data.referrerCommissionPercent) / 100)
    : undefined;

  // 2. Check for duplicate enrollment (only if batch is assigned)
  if (batchId) {
    const existing = await getSchoolEnrollments({ studentUserId: finalStudentUserId, batchId });
    const active = existing.filter((e) => !["dropped", "expelled"].includes(e.status));
    if (active.length > 0) throw new Error("Student is already enrolled in this batch");
  }

  // 3. Create Enrollment
  const enrollment = await createSchoolEnrollment({
    studentUserId: finalStudentUserId,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    studentPhone: data.studentPhone,
    batchId,
    batchCode,
    courseId,
    courseName,
    totalFee: data.totalFee,
    discountAmount,
    discountReason: data.discountReason,
    netFee,
    paymentStatus: "unpaid",
    enrolledAt: new Date().toISOString(),
    status: isBatchConfirmed ? "enrolled" : "applied",
    enrollmentSource: source,
    partnerId: data.partnerId,
    partnerName: data.partnerName,
    referrerId: data.referrerId,
    referrerName: data.referrerName,
    referrerEmail: data.referrerEmail,
    referrerCommissionPercent: data.referrerCommissionPercent,
    referrerCommissionAmount,
    referrerCommissionStatus: referrerCommissionAmount ? "pending" : undefined,
    batchConfirmed: isBatchConfirmed,
    loginCredentialsSent: source === "new-student",
    createdBy: adminUser.id,
  });

  // 4. Generate installments if fee >= 10,000
  if (netFee >= 10000) {
    await generateInstallmentSchedule({
      totalAmount: netFee,
      relatedEntityType: "school-enrollment",
      relatedEntityId: enrollment.id,
      schoolEnrollmentId: enrollment.id,
      clientId: finalStudentUserId,
      clientName: data.studentName,
      orderDate: new Date(),
    });
  }

  // 5. Audit Log
  await writeAuditLog({
    action: "school.enrollment.created",
    actorId: adminUser.id,
    actorEmail: adminUser.email,
    targetId: enrollment.id,
    targetType: "school-enrollment",
    after: { studentName: data.studentName, batchCode, netFee, source },
  });

  revalidatePath("/admin/school/enrollments");
  revalidatePath("/admin/school/students");
  return JSON.parse(JSON.stringify(enrollment));
}

// ── Assign batch to a previously created enrollment ──

export async function assignBatchToEnrollmentAction(enrollmentId: string, batchId: string) {
  const user = await requirePermission("school.enrollment.manage");
  await assignBatchToEnrollment(enrollmentId, batchId);

  await writeAuditLog({
    action: "school.enrollment.batch.assigned",
    actorId: user.id,
    actorEmail: user.email,
    targetId: enrollmentId,
    targetType: "school-enrollment",
    after: { batchId },
  });

  revalidatePath("/admin/school/enrollments");
  revalidatePath("/admin/school/students");
}

// ── Confirm payment for an enrollment ──

export async function confirmEnrollmentPaymentAction(enrollmentId: string, amountPaid: number) {
  const user = await requirePermission("school.enrollment.manage");
  const enrollment = await getSchoolEnrollmentById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");

  const newAmountPaid = (enrollment.amountPaid || 0) + amountPaid;
  const newAmountRemaining = Math.max(0, enrollment.netFee - newAmountPaid);
  const newPaymentStatus: SchoolEnrollment["paymentStatus"] =
    newAmountRemaining === 0 ? "paid" : newAmountPaid > 0 ? "partial" : "unpaid";

  await updateSchoolEnrollment(enrollmentId, {
    amountPaid: newAmountPaid,
    amountRemaining: newAmountRemaining,
    paymentStatus: newPaymentStatus,
    paymentConfirmedBy: user.name,
    paymentConfirmedAt: new Date().toISOString(),
  });

  await writeAuditLog({
    action: "school.enrollment.payment.confirmed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: enrollmentId,
    targetType: "school-enrollment",
    after: { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus },
  });

  revalidatePath("/admin/school/enrollments");
  revalidatePath("/admin/school/students");
}

// ── Fetch partners for enrollment partner-sale dropdown ──

export async function fetchPartnersForEnrollment() {
  await requirePermission("school.enrollment.create");
  try {
    const { getPartners } = await import("@/lib/sharepoint");
    const partners = await getPartners();
    return partners.map((p: { id: string; companyName?: string; name?: string; email?: string; contactEmail?: string }) => ({
      id: p.id,
      name: p.companyName || p.name || "Unknown Partner",
      email: p.email || p.contactEmail || "",
    }));
  } catch {
    return [];
  }
}

// ── Teacher Earnings ──

export async function getTeacherEarningsAction(teacherId?: string) {
  await requirePermission("school.teacher.manage");
  const earnings = await getTeacherEarnings(teacherId ? { teacherId } : undefined);
  return JSON.parse(JSON.stringify(earnings)) as TeacherEarning[];
}

export async function requestTeacherWithdrawalAction(earningIds: string[]) {
  const user = await requirePermission("school.teacher.manage");
  await Promise.all(
    earningIds.map((id) =>
      updateTeacherEarning(id, { status: "requested", requestedAt: new Date().toISOString() })
    )
  );

  await writeAuditLog({
    action: "teacher.earnings.withdrawal.requested",
    actorId: user.id,
    actorEmail: user.email,
    targetId: earningIds.join(","),
    targetType: "teacher-earning",
    after: { status: "requested", count: earningIds.length },
  });

  revalidatePath("/admin/school/teachers");
  revalidatePath("/admin/school/teachers/earnings");
}

export async function updateTeacherEarningPaymentAction(earningIds: string[]) {
  const user = await requirePermission("school.teacher.manage");
  await Promise.all(
    earningIds.map((id) =>
      updateTeacherEarning(id, {
        status: "paid",
        processedAt: new Date().toISOString(),
        processedBy: user.name,
      })
    )
  );

  await writeAuditLog({
    action: "teacher.earnings.paid",
    actorId: user.id,
    actorEmail: user.email,
    targetId: earningIds.join(","),
    targetType: "teacher-earning",
    after: { status: "paid", count: earningIds.length },
  });

  revalidatePath("/admin/school/teachers");
  revalidatePath("/admin/school/teachers/earnings");
}

export async function calculateBatchTeacherEarningsAction(batchId: string) {
  const user = await requirePermission("school.batch.manage");

  const batch = await getSchoolBatchById(batchId);
  if (!batch) throw new Error("Batch not found");

  const teacher = (await getSchoolTeachers()).find((t) => t.id === batch.teacherId);
  if (!teacher || !teacher.revenueSharePercent) return; // No revenue share configured

  const enrollments = await getSchoolEnrollments({ batchId, status: "enrolled" });

  for (const enrollment of enrollments) {
    const earningAmount = Math.round((enrollment.netFee * teacher.revenueSharePercent) / 100);
    await createTeacherEarning({
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      batchId,
      batchCode: batch.batchCode,
      courseName: batch.courseName,
      enrollmentId: enrollment.id,
      studentName: enrollment.studentName,
      grossAmount: enrollment.netFee,
      revenueSharePercent: teacher.revenueSharePercent,
      earningAmount,
      currency: "BDT",
      status: "eligible",
    });
  }

  await writeAuditLog({
    action: "batch.teacher.earnings.calculated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: batchId,
    targetType: "school-batch",
    after: { teacherId: teacher.id, enrollmentCount: enrollments.length },
  });

  revalidatePath("/admin/school/teachers");
}

export async function updateEnrollmentStatus(id: string, status: SchoolStudentStatus) {
  const user = await requirePermission("school.enrollment.manage");
  await updateSchoolEnrollment(id, { status });

  await writeAuditLog({
    action: "school.enrollment.status.changed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-enrollment",
    after: { status },
  });

  revalidatePath("/admin/school/enrollments");
}

export async function updateEnrollment(id: string, data: Partial<SchoolEnrollment>) {
  const user = await requirePermission("school.enrollment.manage");
  await updateSchoolEnrollment(id, data);

  await writeAuditLog({
    action: "school.enrollment.updated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-enrollment",
    after: data,
  });

  revalidatePath("/admin/school/enrollments");
}

export async function deleteEnrollment(id: string) {
  const user = await requirePermission("school.enrollment.manage");
  await deleteSchoolEnrollment(id);

  await writeAuditLog({
    action: "school.enrollment.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-enrollment",
  });

  revalidatePath("/admin/school/enrollments");
}

export async function fetchStudentsAction(search?: string) {
  await requirePermission("school.enrollment.create");
  return getSchoolStudents({ search });
}

// ── Fetch language course candidates from SharePoint (for partner-sale mode) ──
export async function fetchLanguageCandidatesAction(partnerId?: string) {
  await requirePermission("school.enrollment.create");
  try {
    const { getCandidates } = await import("@/lib/sharepoint");
    const all = await getCandidates(partnerId || undefined);
    return all
      .filter((c) => !c.workflowCategory || c.workflowCategory === "Training & Language")
      .map((c) => ({
        id: c.id,
        sccgId: c.sccgId,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone || "",
        partnerId: c.partnerId,
        partnerName: c.partnerName || "",
        paymentStatus: c.paymentStatus,
        country: c.country || "",
      }));
  } catch {
    return [];
  }
}

// ── Content ──

export async function fetchContent(filters?: { courseId?: string; batchId?: string }) {
  await requirePermission("school.content.upload");
  return getSchoolContent(filters);
}

export async function uploadContent(data: {
  courseId: string;
  batchId?: string;
  title: string;
  description?: string;
  contentType: ContentType;
  fileUrl?: string;
  externalUrl?: string;
  fileSize?: number;
  sessionNumber?: number;
  sortOrder: number;
}) {
  const user = await requirePermission("school.content.upload");

  const content = await createSchoolContent({
    ...data,
    isPublished: false,
    uploadedBy: user.id,
    uploadedByName: user.name,
  });

  await writeAuditLog({
    action: "school.content.uploaded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: content.id,
    targetType: "school-content",
    after: { title: data.title, contentType: data.contentType },
  });

  return content;
}

export async function publishContent(id: string) {
  const user = await requirePermission("school.content.upload");
  await updateSchoolContent(id, { isPublished: true });

  await writeAuditLog({
    action: "school.content.published",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-content",
  });
}

export async function removeContent(id: string) {
  const user = await requirePermission("school.content.upload");
  await deleteSchoolContent(id);

  await writeAuditLog({
    action: "school.content.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-content",
  });
}

// ── Attendance ──

export async function fetchAttendance(batchId: string, sessionNumber?: number) {
  await requirePermission("school.attendance.record");
  return getSchoolAttendance(batchId, sessionNumber);
}

export async function submitAttendance(
  batchId: string,
  sessionNumber: number,
  sessionDate: string,
  records: Array<{ studentUserId: string; studentName: string; status: "present" | "absent" | "late" | "excused" }>
) {
  const user = await requirePermission("school.attendance.record");

  const attendanceRecords = records.map((r) => ({
    batchId,
    sessionNumber,
    sessionDate,
    studentUserId: r.studentUserId,
    studentName: r.studentName,
    status: r.status,
    markedBy: user.id,
    markedAt: new Date().toISOString(),
  }));

  await recordAttendanceBatch(attendanceRecords);

  await writeAuditLog({
    action: "school.attendance.recorded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: batchId,
    targetType: "school-batch",
    metadata: { sessionNumber, studentCount: records.length },
  });
}

// ── Exam Results ──

export async function fetchExamResults(filters?: { batchId?: string; studentUserId?: string; status?: string }) {
  // Allow teacher (own batch) or admin/school-manager
  await requirePermission("school.results.enter");
  return getSchoolExamResults(filters);
}

export async function enterExamResult(data: {
  batchId: string;
  courseId: string;
  studentUserId: string;
  studentName: string;
  enrollmentId: string;
  examType: ExamType;
  examName: string;
  examDate: string;
  maxScore: number;
  obtainedScore: number;
  remarks?: string;
}) {
  const user = await requirePermission("school.results.enter");

  if (!Number.isFinite(data.maxScore) || data.maxScore <= 0) {
    throw new Error("maxScore must be a positive number");
  }
  if (!Number.isFinite(data.obtainedScore) || data.obtainedScore < 0 || data.obtainedScore > data.maxScore) {
    throw new Error("obtainedScore must be between 0 and maxScore");
  }

  const percentage = Math.round((data.obtainedScore / data.maxScore) * 100);
  const isPassed = percentage >= 40;

  // Determine grade
  let grade = "F";
  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B+";
  else if (percentage >= 60) grade = "B";
  else if (percentage >= 50) grade = "C";
  else if (percentage >= 40) grade = "D";

  const result = await createSchoolExamResult({
    ...data,
    percentage,
    grade,
    isPassed,
    status: "draft",
    enteredBy: user.id,
  });

  await writeAuditLog({
    action: "school.results.entered",
    actorId: user.id,
    actorEmail: user.email,
    targetId: result.id,
    targetType: "school-exam-result",
    after: { studentName: data.studentName, examType: data.examType, percentage, grade },
  });

  return result;
}

export async function publishResults(batchId: string, examType: string) {
  const user = await requirePermission("school.results.publish");

  const count = await publishExamResults(batchId, examType);

  // Notify students
  const enrollments = await getSchoolEnrollments({ batchId });
  const batch = await getSchoolBatchById(batchId);

  for (const enrollment of enrollments) {
    try {
      const emailData = buildResultsPublishedEmail({
        studentName: enrollment.studentName,
        courseName: enrollment.courseName,
        batchCode: enrollment.batchCode,
        examName: `${examType} Exam`,
      });
      await sendEmailViaGraph({
        to: enrollment.studentEmail,
        toName: enrollment.studentName,
        subject: emailData.subject,
        htmlBody: emailData.htmlBody,
        senderUserId: process.env.O365_SCHOOL_SENDER || undefined,
      });
    } catch (err) {
      console.error("Failed to send results email to", enrollment.studentEmail, err);
    }
  }

  await writeAuditLog({
    action: "school.results.published",
    actorId: user.id,
    actorEmail: user.email,
    targetId: batchId,
    targetType: "school-batch",
    metadata: { examType, publishedCount: count },
  });

  return count;
}

// ── Certificates ──

export async function fetchCertificates(filters?: { studentUserId?: string; batchId?: string; status?: string }) {
  await requirePermission("school.certificate.issue");
  return getSchoolCertificates(filters);
}

export async function fetchCertificateById(id: string) {
  await requirePermission("school.certificate.issue");
  return getSchoolCertificateById(id);
}

/**
 * Determine eligible students for certificate issuance
 */
export async function getCertificateEligibility(batchId: string) {
  await requirePermission("school.certificate.issue");

  const enrollments = await getSchoolEnrollments({ batchId, status: "completed" });
  const allAttendance = await getSchoolAttendance(batchId);
  const batch = await getSchoolBatchById(batchId);
  const results = await getSchoolExamResults({ batchId, status: "published" });

  if (!batch) throw new Error("Batch not found");

  const totalSessions = batch.enrolledStudents > 0
    ? [...new Set(allAttendance.map((a) => a.sessionNumber))].length
    : 0;

  return enrollments.map((enrollment) => {
    const studentAttendance = allAttendance.filter((a) => a.studentUserId === enrollment.studentUserId);
    const presentCount = studentAttendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attendancePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    const finalResult = results.find(
      (r) => r.studentUserId === enrollment.studentUserId && r.examType === "final"
    );

    return {
      enrollment,
      attendancePercent,
      finalGrade: finalResult?.grade || null,
      examScore: finalResult?.percentage || null,
      isPassed: finalResult?.isPassed || false,
      eligibleParticipation: attendancePercent >= 75,
      eligibleCompletion: attendancePercent >= 75 && (finalResult?.isPassed || false),
    };
  });
}

export async function issueCertificate(data: {
  certificateType: CertificateType;
  studentUserId: string;
  studentName: string;
  studentSccgId: string;
  enrollmentId: string;
  courseId: string;
  courseName: string;
  courseLevel: string;
  batchId: string;
  batchCode: string;
  attendancePercentage: number;
  finalGrade?: string;
  examScore?: number;
}) {
  const user = await requirePermission("school.certificate.issue");

  // Server-side eligibility recompute. Never trust client-supplied attendance/score.
  if (!data.studentSccgId || data.studentSccgId.trim().length < 3) {
    throw new Error("Invalid studentSccgId");
  }
  if (!data.courseLevel || data.courseLevel.trim().length === 0) {
    throw new Error("Missing courseLevel");
  }
  const allAttendance = await getSchoolAttendance(data.batchId);
  const totalSessions = [...new Set(allAttendance.map((a) => a.sessionNumber))].length;
  const studentAttendance = allAttendance.filter((a) => a.studentUserId === data.studentUserId);
  const presentCount = studentAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const attendancePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
  // Only enforce attendance threshold when attendance records exist
  if (totalSessions > 0 && attendancePercent < 75) {
    throw new Error(`Not eligible: attendance ${attendancePercent}% is below 75% threshold`);
  }
  const publishedResults = await getSchoolExamResults({
    batchId: data.batchId,
    studentUserId: data.studentUserId,
    status: "published",
  });
  const finalResult = publishedResults.find((r) => r.examType === "final");
  if (data.certificateType === "completion") {
    if (!finalResult) {
      throw new Error("Not eligible: no published final exam result");
    }
    if (!finalResult.isPassed) {
      throw new Error("Not eligible: student did not pass the final exam");
    }
  }
  // Override caller-supplied numbers with authoritative recomputed values.
  const authoritativeAttendance = attendancePercent;
  const authoritativeGrade = finalResult?.grade ?? data.finalGrade;
  const authoritativeExamScore = finalResult?.percentage ?? data.examScore;

  const cert = await createSchoolCertificate({
    certificateType: data.certificateType,
    studentUserId: data.studentUserId,
    studentName: data.studentName,
    studentSccgId: data.studentSccgId,
    enrollmentId: data.enrollmentId,
    courseId: data.courseId,
    courseName: data.courseName,
    courseLevel: data.courseLevel as import("@/types").CourseLevel,
    batchId: data.batchId,
    batchCode: data.batchCode,
    attendancePercentage: authoritativeAttendance,
    finalGrade: authoritativeGrade,
    examScore: authoritativeExamScore,
    issuedDate: new Date().toISOString().split("T")[0],
    issuedBy: user.id,
    issuedByName: user.name,
    status: "issued",
  });

  // Update enrollment with cert ID
  const certField = data.certificateType === "participation" ? "participationCertId" : "completionCertId";
  await updateSchoolEnrollment(data.enrollmentId, { [certField]: cert.id });

  // Fetch enrollment for email/mirror
  let studentEmail = "";
  try {
    const enrollment = await getSchoolEnrollmentById(data.enrollmentId);
    studentEmail = enrollment?.studentEmail || "";
  } catch {}

  // Send certificate email
  try {
    const emailData = buildCertificateEmail({
      studentName: data.studentName,
      certificateType: data.certificateType === "participation" ? "Participation Certificate" : "Course Completion Certificate",
      courseName: data.courseName,
      certificateNumber: cert.certificateNumber,
      verificationUrl: cert.verificationUrl,
    });
    await sendEmailViaGraph({
      to: studentEmail,
      toName: data.studentName,
      subject: emailData.subject,
      htmlBody: emailData.htmlBody,
      senderUserId: process.env.O365_SCHOOL_SENDER || undefined,
    });
  } catch (err) {
    console.error("Failed to send certificate email:", err);
  }

  // Mirror to SharePoint (best-effort — SP list may not exist yet)
  try {
    await mirrorCertificateToSharePoint(cert);
  } catch (err) {
    console.warn("[certificate] SharePoint mirror skipped:", err instanceof Error ? err.message : err);
  }

  // Notify the student in real time.
  try {
    const { createNotification } = await import("@/lib/sharepoint");
    await createNotification({
      userId: data.studentUserId,
      userType: "customer",
      type: "general",
      title: "Certificate issued",
      message: `Your certificate ${cert.certificateNumber} for ${data.courseName} is ready.`,
      read: false,
      relatedId: cert.id,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("certificate notification failed:", err);
  }

  await writeAuditLog({
    action: "certificate.issued",
    actorId: user.id,
    actorEmail: user.email,
    targetId: cert.id,
    targetType: "school-certificate",
    after: {
      certificateNumber: cert.certificateNumber,
      certificateType: data.certificateType,
      studentName: data.studentName,
      verificationCode: cert.verificationCode,
    },
  });

  revalidatePath("/admin/school/certificates");
  return cert;
}

export async function revokeCertificateAction(id: string, reason: string) {
  const user = await requirePermission("school.certificate.revoke");
  await revokeSchoolCertificate(id, reason, user.id);

  // Mirror revocation to SharePoint
  /* 
  await updateCertificateInSharePoint(id, {
    status: "revoked",
    revokedAt: new Date().toISOString(),
    revocationReason: reason,
    revokedBy: user.id,
  });
  */

  await writeAuditLog({
    action: "certificate.revoked",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-certificate",
    after: { reason },
  });

  revalidatePath("/admin/school/certificates");
}

// ── Teachers ──

export async function fetchTeachers(search?: string) {
  await requirePermission("school.teacher.manage");
  return getSchoolTeachers({ search });
}

export async function fetchTeacherById(id: string) {
  await requirePermission("school.teacher.manage");
  return getSchoolTeacherById(id);
}

export async function createTeacher(data: {
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  language?: string;
  bio?: string;
  revenueSharePercent?: number;
}) {
  const adminUser = await requirePermission("school.teacher.manage");
  
  const db = getAdminFirestore();
  const { getAdminApp } = await import("@/lib/firebase-admin");
  const adminApp = getAdminApp();
  const firebaseAuth = adminApp ? (await import("firebase-admin")).auth(adminApp) : null;

  let userId = "";
  let tempPassword = "";
  let isNewFirebaseUser = false;

  // Check if Firebase Auth user already exists
  let existingFirebaseUid: string | null = null;
  if (firebaseAuth) {
    try {
      const fbUser = await firebaseAuth.getUserByEmail(data.email);
      existingFirebaseUid = fbUser.uid;
    } catch {
      // User doesn't exist in Firebase Auth — will create
    }
  }

  // Link or create Firestore profile
  const existingUser = await db.collection("users").where("email", "==", data.email).limit(1).get();
  
  if (!existingUser.empty) {
    userId = existingUser.docs[0].id;
    const roles = existingUser.docs[0].data().roles || [];
    if (!roles.includes("teacher")) {
      await db.collection("users").doc(userId).update({
        roles: [...roles, "teacher"],
        role: "teacher",
        updatedAt: new Date().toISOString(),
      });
    }
  } else {
    // Create Firestore user doc
    const sccgId = await generateSccgId("USR");
    const newUser = {
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      role: "teacher",
      roles: ["teacher"],
      sccgId,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ref = await db.collection("users").add(newUser);
    userId = ref.id;
  }

  // Create Firebase Auth user if doesn't exist
  if (!existingFirebaseUid && firebaseAuth) {
    // Generate a secure temporary password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    tempPassword = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    
    try {
      await firebaseAuth.createUser({
        uid: userId,
        email: data.email,
        displayName: data.name,
        password: tempPassword,
        emailVerified: false,
      });
      isNewFirebaseUser = true;
    } catch {
      // If uid conflict, create without specifying uid
      const created = await firebaseAuth.createUser({
        email: data.email,
        displayName: data.name,
        password: tempPassword,
        emailVerified: false,
      });
      // Update Firestore doc with the new Firebase UID
      await db.collection("users").doc(userId).update({ firebaseUid: created.uid });
    }
  }

  const teacher = await createSchoolTeacher({
    ...data,
    userId,
    revenueSharePercent: data.revenueSharePercent ?? 0,
    status: "active",
  });

  // Send login credentials email to the new teacher
  if (isNewFirebaseUser && tempPassword) {
    try {
      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;letter-spacing:-0.5px;">Welcome to SCCG Language School</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Your teacher account has been created</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:16px;margin:0 0 16px;">Hello <strong>${data.name}</strong>,</p>
            <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">You have been registered as a teacher at SCCG Language School. Please use the credentials below to log in to your portal.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 24px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;">Portal URL</td><td style="padding:8px 0;font-size:13px;"><a href="https://portal.mysccg.de/login" style="color:#6366f1;font-weight:700;">portal.mysccg.de/login</a></td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;">Email</td><td style="padding:8px 0;font-size:13px;font-weight:700;color:#111827;">${data.email}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;">Temporary Password</td><td style="padding:8px 0;font-size:15px;font-weight:900;color:#6366f1;letter-spacing:1px;">${tempPassword}</td></tr>
              </table>
            </div>
            <p style="color:#ef4444;font-size:13px;margin:0 0 24px;padding:12px 16px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
              ⚠️ Please change your password immediately after your first login for security.
            </p>
            <p style="color:#6b7280;font-size:13px;margin:0;">If you have any questions, please contact the school administration.</p>
          </div>
        </div>`;
      await sendEmailViaGraph({
        to: data.email,
        toName: data.name,
        subject: "Welcome to SCCG Language School — Your Login Credentials",
        htmlBody,
        senderUserId: process.env.O365_SCHOOL_SENDER || undefined,
      });
    } catch (emailErr) {
      console.error("Failed to send teacher welcome email:", emailErr);
    }
  }

  await writeAuditLog({
    action: "school.teacher.created",
    actorId: adminUser.id,
    actorEmail: adminUser.email,
    targetId: teacher.id,
    targetType: "school-teacher",
    after: { name: teacher.name, email: teacher.email },
  });

  revalidatePath("/admin/school/teachers");
  return { teacher, credentialsSent: isNewFirebaseUser };
}

export async function updateTeacher(id: string, data: Partial<SchoolTeacher>) {
  const user = await requirePermission("school.course.publish");
  await updateSchoolTeacher(id, data);

  await writeAuditLog({
    action: "school.teacher.updated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-teacher",
    after: data,
  });

  revalidatePath("/admin/school/teachers");
}

export async function deleteTeacher(id: string) {
  const user = await requirePermission("school.course.publish");
  await deleteSchoolTeacher(id);

  await writeAuditLog({
    action: "school.teacher.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-teacher",
  });

  revalidatePath("/admin/school/teachers");
}

export async function registerManualCertificate(data: {
  studentName: string;
  studentEmail: string;
  certificateType: CertificateType;
  courseLevel: string;
  courseName?: string;
  issueDate: string;
  endDate?: string;
}) {
  const user = await requirePermission("school.certificate.issue");

  // For manual certificates, we might not have a full enrollment record, 
  // so we create a standalone certificate that points to the student's email.
  const cert = await createSchoolCertificate({
    certificateType: data.certificateType,
    studentUserId: "manual-" + data.studentEmail, // Placeholder for manual entries
    studentName: data.studentName,
    studentSccgId: "MANUAL",
    enrollmentId: "manual",
    courseId: "manual",
    courseName: data.courseName || "SCCG Language Course",
    courseLevel: data.courseLevel as import("@/types").CourseLevel,
    batchId: "manual",
    batchCode: "MANUAL",
    attendancePercentage: 100, // Default for manual
    issuedDate: data.issueDate,
    issuedBy: user.id,
    issuedByName: user.name,
    status: "issued",
  });

  // Mirror to SharePoint (best-effort — SP list may not exist yet)
  try {
    await mirrorCertificateToSharePoint(cert);
  } catch (err) {
    console.warn("[certificate] SharePoint mirror skipped:", err instanceof Error ? err.message : err);
  }

  await writeAuditLog({
    action: "certificate.manual.registered",
    actorId: user.id,
    actorEmail: user.email,
    targetId: cert.id,
    targetType: "school-certificate",
    after: {
      certificateNumber: cert.certificateNumber,
      studentName: data.studentName,
      verificationCode: cert.verificationCode,
    },
  });

  return JSON.parse(JSON.stringify(cert)) as SchoolCertificate;
}

export async function deleteCertificateAction(id: string) {
  const user = await requirePermission("school.certificate.issue");

  // Get the certificate first to check it exists
  const cert = await getSchoolCertificateById(id);
  if (!cert) throw new Error("Certificate not found");

  // Delete from Firestore
  const { getAdminFirestore: getDb } = await import("@/lib/firebase-admin");
  await getDb().collection("schoolCertificates").doc(id).delete();

  // Delete from SharePoint
  // await deleteCertificateFromSharePoint(id);

  await writeAuditLog({
    action: "certificate.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-certificate",
    after: { certificateNumber: cert.certificateNumber, studentName: cert.studentName },
  });

  revalidatePath("/admin/school/certificates");
}

export async function updateCertificateAction(id: string, data: { studentName?: string; courseName?: string; courseLevel?: string; status?: string }) {
  const user = await requirePermission("school.certificate.issue");

  const updates: Record<string, unknown> = {};
  if (data.studentName) updates.studentName = data.studentName;
  if (data.courseName) updates.courseName = data.courseName;
  if (data.courseLevel) updates.courseLevel = data.courseLevel;
  if (data.status) updates.status = data.status;

  const { getAdminFirestore: getDb } = await import("@/lib/firebase-admin");
  await getDb().collection("schoolCertificates").doc(id).update(updates);

  await writeAuditLog({
    action: "certificate.updated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-certificate",
    after: data,
  });

  revalidatePath("/admin/school/certificates");
}

// ── Students ──

export async function fetchAllEnrollmentsAction(filters?: { batchId?: string; courseId?: string; paymentStatus?: string }) {
  await requirePermission("school.enrollment.manage");
  return getSchoolEnrollments(filters);
}

export async function sendPaymentReminderAction(enrollmentId: string) {
  const user = await requirePermission("school.enrollment.manage");

  const enrollment = await getSchoolEnrollmentById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");

  // Determine recipient: check if student came via partner registration
  let recipientEmail = enrollment.studentEmail;
  let recipientName = enrollment.studentName;
  let isPartnerReminder = false;

  try {
    const { getCandidates, getPartners } = await import("@/lib/sharepoint");
    const candidates = await getCandidates();
    const matchingCandidate = candidates.find(
      (c) => c.email?.toLowerCase() === enrollment.studentEmail.toLowerCase() && c.partnerId
    );
    if (matchingCandidate?.partnerId) {
      const partners = await getPartners();
      const partner = partners.find((p) => p.id === matchingCandidate.partnerId);
      if (partner?.email) {
        recipientEmail = partner.email;
        recipientName = partner.name;
        isPartnerReminder = true;
      }
    }
  } catch (err) {
    console.error("Failed to check partner linkage:", err);
  }

  const amountDue = enrollment.amountRemaining ?? (enrollment.netFee - (enrollment.amountPaid || 0));
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">Payment Reminder</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">SCCG Language School</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;margin:0 0 16px;">Dear <strong>${recipientName}</strong>,</p>
        ${isPartnerReminder
          ? `<p style="color:#6b7280;font-size:14px;margin:0 0 16px;">This is a reminder regarding your enrolled student <strong>${enrollment.studentName}</strong>.</p>`
          : ""}
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">We would like to remind you that there is an outstanding payment for the following enrollment:</p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">Student</td><td style="padding:6px 0;font-size:13px;font-weight:700;">${enrollment.studentName}</td></tr>
            <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">Course</td><td style="padding:6px 0;font-size:13px;">${enrollment.courseName}</td></tr>
            <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">Batch</td><td style="padding:6px 0;font-size:13px;">${enrollment.batchCode}</td></tr>
            <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">Total Fee</td><td style="padding:6px 0;font-size:13px;">৳${enrollment.netFee.toLocaleString()}</td></tr>
            <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">Amount Paid</td><td style="padding:6px 0;font-size:13px;color:#059669;font-weight:700;">৳${(enrollment.amountPaid || 0).toLocaleString()}</td></tr>
            <tr style="border-top:2px solid #fde68a;"><td style="padding:10px 0 6px;color:#92400e;font-size:14px;font-weight:900;">Amount Due</td><td style="padding:10px 0 6px;font-size:14px;font-weight:900;color:#d97706;">৳${amountDue.toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0;">Please arrange the payment at your earliest convenience. Contact us at <a href="mailto:school@mysccg.de" style="color:#d97706;">school@mysccg.de</a> for any queries.</p>
      </div>
    </div>`;

  await sendEmailViaGraph({
    to: recipientEmail,
    toName: recipientName,
    subject: `Payment Reminder — ${enrollment.studentName} (${enrollment.batchCode})`,
    htmlBody,
    senderUserId: process.env.O365_SCHOOL_SENDER || undefined,
  });

  await writeAuditLog({
    action: "school.payment.reminder.sent",
    actorId: user.id,
    actorEmail: user.email,
    targetId: enrollmentId,
    targetType: "school-enrollment",
    metadata: { recipientEmail, isPartnerReminder },
  });

  return { success: true, sentTo: recipientEmail, isPartnerReminder };
}
