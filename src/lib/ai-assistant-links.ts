export type AssistantId = "copilot" | "gemini" | "notebooklm";

export interface AssistantLink {
  id: AssistantId;
  label: string;
  url: string;
  description: string;
}

export function getAssistantLinks(): AssistantLink[] {
  return [
    {
      id: "copilot",
      label: "Copilot Chat",
      url: "https://copilot.microsoft.com",
      description: "Microsoft Copilot for web assistance",
    },
    {
      id: "gemini",
      label: "Gemini",
      url: "https://gemini.google.com",
      description: "Google Gemini workspace assistant",
    },
    {
      id: "notebooklm",
      label: "NotebookLM",
      url: "https://notebooklm.google.com",
      description: "NotebookLM for grounded research",
    },
  ];
}
