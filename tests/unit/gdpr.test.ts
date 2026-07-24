import { describe, it, expect, vi } from "vitest";
import { getAnonymizedCv } from "../../src/lib/gdpr-service";
import type { CandidateCvVariation } from "../../src/types";

describe("GDPR / DSGVO Compliance Service", () => {
  it("should correctly mask personal details in the CV content description", () => {
    const mockCv: CandidateCvVariation = {
      id: "var-1",
      name: "Max Mustermann",
      title: "Fullstack Architect",
      summary: "I am Max, reaching out at max@mustermann.de or +49 176 1234567.",
      experience: [
        {
          company: "ABC GmbH",
          role: "Developer",
          period: "2020-2022",
          description: "Responsible for database. Contact me at support@abc.com or call 089 12345678."
        }
      ],
      education: [],
      skills: [],
      languages: [],
      templateColor: "bg-indigo-600",
      templateFont: "font-sans",
      layoutType: "tech",
      hasPhoto: true
    };

    const anonymized = getAnonymizedCv(mockCv);

    // Assert name is replaced
    expect(anonymized.name).toBe("Candidate Anonymized (DSGVO)");
    // Assert photoUrl is omitted
    expect(anonymized.photoUrl).toBeUndefined();
    // Assert emails are masked in description
    expect(anonymized.experience[0].description).toContain("[email masked]");
    // Assert phone numbers are masked in description
    expect(anonymized.experience[0].description).toContain("[phone masked]");
  });
});
