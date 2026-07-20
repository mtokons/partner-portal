import { NextResponse } from "next/server";
import { getCandidates } from "@/lib/sharepoint";

/**
 * GET /api/cv-maker/candidates
 * Fetches the real registered candidates from SharePoint, filters those
 * with seeker roles (job-seeker, ausbildung-seeker, etc.), and maps them
 * to the CandidateData structure used in the CV Creator.
 */
export async function GET() {
  try {
    const list = await getCandidates();
    
    // Filter seekers (job-seeker, ausbildung-seeker, and similar)
    const seekers = list.filter((c: any) => {
      const cat = (c.workflowCategory || "").toLowerCase();
      return cat.includes("seeker") || cat.includes("job") || cat.includes("ausbildung") || cat.includes("student");
    });

    const source = seekers.length > 0 ? seekers : list;

    // Map to CandidateData structure
    const mapped = source.map((c: any) => ({
      name: c.fullName || "",
      title: (c.workflowCategory || "Job Seeker")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char: string) => char.toUpperCase()),
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      nationality: c.nationality || c.country || "",
      birthDate: c.dateOfBirth || "",
      website: "",
      profileSummary: `Registered candidate under ${c.workflowCategory || "job-seeker"} pathway. Ready to transition into relevant roles and apply skills effectively.`,
      skills: [],
      experience: [],
      education: [],
      customSections: []
    }));

    return NextResponse.json({ success: true, candidates: mapped });
  } catch (err: any) {
    // Return empty list on failure, ensuring fallback to mock data
    return NextResponse.json({ success: false, candidates: [], error: err.message });
  }
}
