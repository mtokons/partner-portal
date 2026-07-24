/** Guardrails that run deterministically after the judge returns — catch hallucinated evidence. */

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "have", "has", "was", "were", "are", "you", "your", "his", "her", "their", "over", "into", "of", "in", "on", "at", "to", "a", "an", "as", "by", "is", "or"]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Verify the judge's quoted evidence actually exists in the CV source.
 * Accepts an exact normalized substring, or a high content-word overlap
 * (the persona is allowed to "closely paraphrase under 25 words").
 */
export function verifyEvidence(evidence: string | null, source: string): boolean {
  if (!evidence || !evidence.trim()) return false;
  const ev = normalize(evidence);
  const src = normalize(source);
  if (!ev || !src) return false;
  if (src.includes(ev)) return true;

  const evWords = ev.split(" ").filter((w) => w.length > 2 && !STOP.has(w));
  if (evWords.length === 0) return false;
  const srcWords = new Set(src.split(" "));
  const hits = evWords.filter((w) => srcWords.has(w)).length;
  return hits / evWords.length >= 0.7;
}
