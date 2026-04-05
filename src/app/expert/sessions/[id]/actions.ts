"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { completeSession, getSessionById } from "@/lib/sharepoint";

export async function completeSessionAction(
  sessionId: string,
  expertNotes: string,
  durationMinutes: number
) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error("Unauthorized");
  const user = authSession.user as SessionUser;

  const session = await getSessionById(sessionId);
  if (!session || session.expertId !== user.id) throw new Error("Not authorized for this session");
  if (session.status !== "scheduled") throw new Error("Session cannot be completed in its current state");

  await completeSession(sessionId, expertNotes, durationMinutes);
  redirect("/expert/sessions");
}
