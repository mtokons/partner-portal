import "server-only";
import { runAgent } from "./runtime";
import { TorStructureSchema, type TorStructure } from "./contracts";
import { TOR_SYSTEM_PROMPT, TOR_PROMPT_VERSION, buildTorUserPrompt } from "./prompts/tor.v1";

/** Deterministic mock — extracts coarse role blocks so the flow works without a key. */
function mockTor(rawText: string): TorStructure {
  const text = rawText.replace(/\r/g, "\n");
  const looksLikeTor = /terms of reference|expert|qualif|evaluation|tender|key expert|scope of/i.test(text);
  if (!looksLikeTor) {
    return { error: "not_a_tor", detectedContent: text.slice(0, 80).replace(/\n/g, " "), projectTitle: null, donor: null, expertRoles: [], deliverables: [] };
  }
  const roleNames = [...text.matchAll(/(Key Expert\s*\d+|Team Leader|Pool\s*\d+|Senior Expert|Non-Key Expert\s*\d*)/gi)]
    .map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  const donor = (text.match(/\b(GIZ|EU|European Union|World Bank|UNDP|UNICEF|ILO|ADB|GFA)\b/i) || [])[1] || null;
  return {
    error: null, detectedContent: null,
    projectTitle: (text.match(/(?:project|programme|assignment)[:\s]+([^\n]{5,80})/i) || [])[1]?.trim() || null,
    donor,
    expertRoles: (roleNames.length ? roleNames : ["Key Expert"]).map((roleName) => ({
      roleName,
      mandatory: [
        { text: "University degree in a relevant field", category: "Education/Training", durationYears: null, binary: true },
        { text: "10 years of relevant professional experience", category: "General Prof. Experience", durationYears: 10, binary: false },
      ],
      preferred: [
        { text: "Experience in development cooperation projects", category: "Dev. Cooperation", durationYears: null, binary: false },
      ],
    })),
    projectCountry: /bangladesh|dhaka/i.test(text) ? "Bangladesh" : null,
    bangladeshProject: /bangladesh|dhaka/i.test(text),
    sectorGroups: [],
    deliverables: [...text.matchAll(/deliverable[s]?[:\s]+([^\n]{5,80})/gi)].map((m) => m[1].trim()).slice(0, 8),
  };
}

/** Persona 1: extract ToR structure (roles, qualifications, deliverables) or flag not_a_tor. */
export async function extractTor(rawText: string, contextRef?: string): Promise<{ tor: TorStructure; provider: string; runId: string }> {
  const { data, provider, runId } = await runAgent<TorStructure>({
    persona: "tor",
    promptVersion: TOR_PROMPT_VERSION,
    system: TOR_SYSTEM_PROMPT,
    user: buildTorUserPrompt(rawText),
    schema: TorStructureSchema,
    mock: () => mockTor(rawText),
    contextRef,
  });
  return { tor: data, provider, runId };
}
