import { describe, it, expect } from "vitest";
import { getAssistantLinks } from "../../src/lib/ai-assistant-links";

describe("assistant links", () => {
  it("returns the supported AI assistants", () => {
    const links = getAssistantLinks();
    expect(links).toHaveLength(3);
    expect(links.map((item) => item.id)).toEqual(["copilot", "gemini", "notebooklm"]);
  });
});
