import { describe, it, expect } from "vitest";
import { buildPortalAssistantPrompt } from "../../src/lib/ai-chat";

describe("portal assistant prompt", () => {
  it("includes prior context and the latest user message", () => {
    const prompt = buildPortalAssistantPrompt([
      { role: "assistant", content: "I can help with the portal." },
      { role: "user", content: "Show me the latest orders" },
    ], "Summarize them");

    expect(prompt).toContain("You are SCCG portal assistant");
    expect(prompt).toContain("Show me the latest orders");
    expect(prompt).toContain("Summarize them");
  });
});
