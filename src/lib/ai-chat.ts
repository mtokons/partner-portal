export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  reply: string;
  provider: string;
}

export function buildPortalAssistantPrompt(history: ChatMessage[], latestMessage: string): string {
  const prior = history
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return [
    "You are SCCG portal assistant. Help the user with the partner portal experience.",
    "Be concise, practical, and action-oriented.",
    "If the user asks for a portal action, suggest the most relevant page or workflow.",
    "Context:",
    prior || "No prior context.",
    "Latest user message:",
    latestMessage,
  ].join("\n\n");
}

export async function getPortalAssistantReply(history: ChatMessage[], latestMessage: string): Promise<ChatReply> {
  const prompt = buildPortalAssistantPrompt(history, latestMessage);
  const provider = process.env.AI_PROVIDER || "mock";

  if (provider === "mock" || !process.env.GEMINI_API_KEY) {
    return {
      reply: "I can help you navigate the portal. Try asking for orders, invoices, clients, expert bank, or project-partner workflows.",
      provider: "mock",
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.0-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      },
    );

    if (!response.ok) throw new Error(`Gemini ${response.status}`);
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { reply: text || "I’m unable to respond right now.", provider: "gemini" };
  } catch {
    return {
      reply: "I’m unable to respond right now, but I can still help you navigate the portal by pointing you to the relevant section.",
      provider: "fallback",
    };
  }
}
