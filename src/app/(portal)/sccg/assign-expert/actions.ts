"use server";

import { requirePermission } from "@/lib/permissions";
import { Repository } from "@/lib/repository";
import { sendEmailViaGraph } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit-log";
import { getCandidates, getCandidateServices, createNotification } from "@/lib/sharepoint";
import type { CustomerPackage, Expert, Session } from "@/types";

export interface AssignExpertPackageRow extends CustomerPackage {
  sessionCount: number;
  workflowCategory?: string;
}

export async function fetchAssignExpertDataAction(): Promise<{
  success: boolean;
  data?: { packages: AssignExpertPackageRow[]; experts: Expert[] };
  error?: string;
}> {
  try {
    await requirePermission("expert.assign");
    const [candidates, experts] = await Promise.all([
      getCandidates(),
      Repository.experts.getAll(),
    ]);

    const candidatesWithServices = await Promise.all(
      candidates.map(async (candidate) => {
        const services = await getCandidateServices(candidate.id);
        return { candidate, services };
      })
    );

    const packages: AssignExpertPackageRow[] = [];
    for (const { candidate, services } of candidatesWithServices) {
      for (const service of services) {
        if (service.packageType === "all-inclusive" || service.packageType === "premium-bundle" || service.serviceName.toLowerCase().includes("ausbildung") || service.serviceName.toLowerCase().includes("visa") || service.serviceName.toLowerCase().includes("card")) {
          packages.push({
            id: candidate.id, // Using candidate.id so we group sessions by candidate
            customerId: candidate.id,
            customerName: candidate.fullName,
            partnerId: candidate.partnerId,
            servicePackageId: service.servicePricingId,
            packageName: service.serviceName,
            status: "active",
            completedSessions: 0,
            totalSessions: 5, // Default for these services
            totalAmount: service.totalPrice,
            amountPaid: 0,
            createdAt: candidate.createdAt,
            workflowCategory: candidate.workflowCategory,
            sessionCount: 5,
          } as AssignExpertPackageRow);
        }
      }
    }

    // Filter duplicates if a candidate has multiple matching services
    const uniquePackages = Array.from(new Map(packages.map(p => [p.id, p])).values());

    return {
      success: true,
      data: {
        packages: uniquePackages,
        experts: experts.filter((e) => e.status !== "inactive"),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load assignment data" };
  }
}

export async function fetchPackageSessionsAction(packageId: string): Promise<{
  success: boolean;
  data?: Session[];
  error?: string;
}> {
  try {
    await requirePermission("session.view.all");
    const sessions = await Repository.sessions.getByPackage(packageId);
    return { success: true, data: sessions.sort((a, b) => a.sessionNumber - b.sessionNumber) };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load sessions" };
  }
}

export async function assignExpertAction(packageId: string, expertId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await requirePermission("expert.assign");
    const expert = (await Repository.experts.getAll()).find((e) => e.id === expertId);
    if (!expert) return { success: false, error: "Expert not found" };

    const candidate = await getCandidates().then(cands => cands.find(c => c.id === packageId));
    let clientName = candidate?.fullName || "Client";
    let customerId = candidate?.id || packageId;
    let packageName = candidate?.workflowCategory || "Service";

    try {
      const customerPackage = await Repository.purchases.getById(packageId);
      if (customerPackage) {
        clientName = customerPackage.customerName || clientName;
        customerId = customerPackage.customerId || customerId;
        packageName = customerPackage.packageName || packageName;
      }
    } catch {
      // Non-blocking fallback if package ID is a candidate ID
    }

    try {
      await Repository.purchases.assignExpert(packageId, expert.id, expert.name);
    } catch {
      // Safe non-blocking assignment fallback
    }

    if (candidate) {
      try {
        const { updateCandidate } = await import("@/lib/sharepoint");
        await updateCandidate(packageId, { expertId: expert.id, expertName: expert.name } as any);
      } catch {}
    }

    await Promise.all([
      createNotification({ userId: expert.id, userType: "expert", type: "expert_assigned", title: "New client assignment", message: `You have been assigned to ${clientName}'s ${packageName} plan.`, read: false, relatedId: packageId, createdAt: new Date().toISOString() }).catch(() => {}),
      createNotification({ userId: customerId, userType: "customer", type: "expert_assigned", title: "Expert assigned", message: `${expert.name} has been assigned to your ${packageName} plan.`, read: false, relatedId: packageId, createdAt: new Date().toISOString() }).catch(() => {}),
    ]);

    await writeAuditLog({
      action: "expert.assign",
      actorId: user.id,
      actorEmail: user.email,
      targetId: packageId,
      targetType: "customerPackage",
      metadata: { expertId: expert.id, expertName: expert.name },
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to assign expert" };
  }
}

export async function updateSessionScheduleAction(input: {
  sessionId: string;
  scheduledAt?: string;
  meetingUrl?: string;
  status?: Session["status"];
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("session.manage");
    const session = await Repository.sessions.getById(input.sessionId);
    if (!session) return { success: false, error: "Session not found" };
    await Repository.sessions.update(input.sessionId, {
      scheduledAt: input.scheduledAt,
      meetingUrl: input.meetingUrl,
      status: input.status || (input.scheduledAt ? "scheduled" : undefined),
    });
    if (input.scheduledAt) {
      await createNotification({ userId: session.customerId, userType: "customer", type: "session_scheduled", title: "Session scheduled", message: `Your session #${session.sessionNumber} is scheduled for ${new Date(input.scheduledAt).toLocaleString("en-GB")}.`, read: false, relatedId: session.id, createdAt: new Date().toISOString() });
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update session" };
  }
}

export async function sendMeetingLinkAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("session.manage");
    const session = await Repository.sessions.getById(sessionId);
    if (!session) return { success: false, error: "Session not found" };
    if (!session.meetingUrl) return { success: false, error: "This session has no meeting link yet" };

    const customer = await Repository.customers.getById(session.customerId);
    if (!customer) return { success: false, error: "Customer not found" };

    const when = session.scheduledAt ? new Date(session.scheduledAt).toLocaleString("en-GB") : "TBD";
    await sendEmailViaGraph({
      to: customer.email,
      toName: customer.name,
      subject: `Your session #${session.sessionNumber} meeting link`,
      htmlBody: `<p>Hi ${customer.name},</p><p>Your session #${session.sessionNumber}${session.expertName ? ` with ${session.expertName}` : ""} is scheduled for <strong>${when}</strong>.</p><p>Join here: <a href="${session.meetingUrl}">${session.meetingUrl}</a></p>`,
    });

    await writeAuditLog({
      action: "session.meeting_link_sent",
      actorId: user.id,
      actorEmail: user.email,
      targetId: session.id,
      targetType: "session",
      metadata: { customerEmail: customer.email, meetingUrl: session.meetingUrl },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send meeting link" };
  }
}

export async function assignSessionAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("expert.assign");
    const sessionId = formData.get("sessionId") as string;
    const candidatePkgId = formData.get("candidatePkgId") as string; // From the frontend
    const sessionNumberStr = formData.get("sessionNumber") as string;
    const expertId = formData.get("expertId") as string;
    const scheduledAt = formData.get("scheduledAt") as string;
    const notes = formData.get("notes") as string;
    const sessionDetailsOverride = formData.get("sessionDetailsOverride") as string;
    const sessionTitle = formData.get("sessionTitle") as string;
    const cvFile = formData.get("cvFile") as File | null;
    
    if (!expertId) return { success: false, error: "Missing expert ID" };

    const expert = (await Repository.experts.getAll()).find((e) => e.id === expertId);
    if (!expert) return { success: false, error: "Expert not found" };

    // Fetch the candidate (since we use candidate.id as packageId now)
    const candidateId = candidatePkgId;
    const candidate = await getCandidates().then(cands => cands.find(c => c.id === candidateId));
    if (!candidate) return { success: false, error: "Candidate not found" };

    let candidateTypeMap = "Student Visa";
    if (candidate.workflowCategory === "ausbildung") candidateTypeMap = "Ausbildung";
    if (candidate.workflowCategory === "opportunity-card") candidateTypeMap = "Opportunity Card";

    let session: Session | null = null;
    if (sessionId && sessionId !== "0") {
      try {
        session = await Repository.sessions.getById(sessionId);
      } catch {
        session = null;
      }
    }
    
    if (!session) {
      if (!candidatePkgId || !sessionNumberStr) return { success: false, error: "Missing candidate ID or session number" };
      // Create it
      session = await Repository.sessions.create({
        customerPackageId: candidateId,
        customerId: candidateId,
        customerName: candidate.fullName,
        partnerId: candidate.partnerId,
        sessionNumber: Number(sessionNumberStr),
        totalSessions: 5,
        status: "pending",
        expertId: expert.id,
        expertName: expert.name,
        candidateType: candidateTypeMap,
        sessionDetailsOverride,
        createdAt: new Date().toISOString(),
      });
    }

    const title = sessionTitle || `Session ${session.sessionNumber} with ${candidate.fullName}`;
    let attachmentUrl = session.attachmentUrl;
    let emailAttachments: any[] = [];
    if (cvFile && cvFile.size > 0) {
      const { uploadDriveFile } = await import("@/lib/graph");
      const buffer = Buffer.from(await cvFile.arrayBuffer());
      const res = await uploadDriveFile(`SessionCVs/${session.customerId}_${session.sessionNumber}_${cvFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`, buffer, cvFile.type);
      attachmentUrl = res.webUrl || res["@microsoft.graph.downloadUrl"];
      
      // Prepare attachment for email
      emailAttachments.push({
        name: cvFile.name,
        contentType: cvFile.type,
        contentBase64: buffer.toString("base64")
      });
    }

    const { updateSessionSchedule } = await import("@/lib/sharepoint");
    const { createMsTeamsMeeting } = await import("@/lib/graph");

    let finalMeetingUrl = session.meetingUrl;
    
    // Automatically generate an MS Teams meeting if a date is set and we don't have a meeting link yet
    if (scheduledAt && !finalMeetingUrl) {
      try {
        const title = sessionTitle || `Session ${session.sessionNumber} with ${candidate.fullName}`;
        // Always use portal@mysccg.de as the organizer for automated Teams meetings
        const organizerEmail = "portal@mysccg.de";
        const meetingRes = await createMsTeamsMeeting(organizerEmail, title, scheduledAt);
        if (meetingRes && meetingRes.joinWebUrl) {
          finalMeetingUrl = meetingRes.joinWebUrl;
        }
      } catch (err: any) {
        console.error("Failed to generate MS Teams meeting:", err.message);
        // We do not fail the whole assignment if Teams generation fails, just log it.
      }
    }

    await updateSessionSchedule(session.id, {
      expertId: expert.id,
      expertName: expert.name,
      scheduledAt: scheduledAt || undefined,
      status: "scheduled",
      notes: notes || undefined,
      attachmentUrl,
      meetingUrl: finalMeetingUrl || undefined,
      candidateType: candidateTypeMap,
      sessionDetailsOverride: sessionDetailsOverride || undefined
    });

    const { buildSessionEmailTemplateAsync } = await import("@/lib/email");

    // Email to Candidate
    const candidateEmailData = await buildSessionEmailTemplateAsync({
      recipientName: candidate.fullName || "Candidate",
      role: "candidate",
      sessionNumber: session.sessionNumber,
      scheduledAt,
      sessionTitle: sessionTitle || `Session ${session.sessionNumber}`,
      sessionDetails: sessionDetailsOverride,
      notes,
      expertName: expert.name,
      candidateType: candidateTypeMap,
      meetingUrl: finalMeetingUrl || undefined,
    });
    
    await sendEmailViaGraph({
      to: candidate.email,
      toName: candidate.fullName,
      subject: candidateEmailData.subject,
      htmlBody: candidateEmailData.htmlBody,
    });

    // Email to Expert
    const expertEmailData = await buildSessionEmailTemplateAsync({
      recipientName: expert.name,
      role: "expert",
      sessionNumber: session.sessionNumber,
      scheduledAt,
      sessionTitle: sessionTitle || `Session ${session.sessionNumber}`,
      sessionDetails: sessionDetailsOverride,
      notes,
      candidateName: candidate.fullName,
      candidateType: candidateTypeMap,
      meetingUrl: finalMeetingUrl || undefined,
    });

    await sendEmailViaGraph({
      to: expert.email,
      toName: expert.name,
      subject: expertEmailData.subject,
      htmlBody: expertEmailData.htmlBody,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined
    });
    
    await createNotification({ userId: expert.id, userType: "expert", type: "expert_assigned", title: "New session assigned", message: `You have been assigned to session #${session.sessionNumber} for ${candidate.fullName}.`, read: false, relatedId: session.id, createdAt: new Date().toISOString() });
    await createNotification({ userId: candidate.id, userType: "customer", type: "session_scheduled", title: "Session scheduled", message: `Session #${session.sessionNumber} scheduled with ${expert.name}.`, read: false, relatedId: session.id, createdAt: new Date().toISOString() });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to assign session" };
  }
}

