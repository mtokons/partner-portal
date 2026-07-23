import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  AlignmentType,
} from "docx";
import type { CvData } from "@/types/cv-builder";

const COLOR_HEX: Record<string, string> = {
  blue: "1E40AF",
  emerald: "059669",
  indigo: "4F46E5",
  crimson: "BE123C",
  slate: "334155",
  violet: "7C3AED",
};

export async function generateCvDocx(cvData: CvData): Promise<Blob> {
  const accentHex = COLOR_HEX[cvData.settings.accentColor] || "1E40AF";
  const { personalInfo, workExperience, education, skills, languages, certifications, projects } = cvData;

  const children: Paragraph[] = [];

  // Header: Name
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: personalInfo.fullName,
          bold: true,
          size: 36, // 18pt
          color: accentHex,
          font: "Arial",
        }),
      ],
    })
  );

  // Header: Job Title
  if (personalInfo.jobTitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: personalInfo.jobTitle,
            size: 24, // 12pt
            color: "475569",
            italics: true,
            font: "Arial",
          }),
        ],
      })
    );
  }

  // Contact Bar
  const contacts = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.website,
  ].filter(Boolean);

  if (contacts.length > 0) {
    children.push(
      new Paragraph({
        space: { after: 200 },
        children: [
          new TextRun({
            text: contacts.join("  |  "),
            size: 18, // 9pt
            color: "64748B",
            font: "Arial",
          }),
        ],
      })
    );
  }

  // Divider helper
  const addSectionHeader = (title: string) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        space: { before: 300, after: 120 },
        border: {
          bottom: {
            color: accentHex,
            space: 4,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 22, // 11pt
            color: accentHex,
            font: "Arial",
          }),
        ],
      })
    );
  };

  // Executive Summary
  if (personalInfo.summary) {
    addSectionHeader("Professional Summary");
    children.push(
      new Paragraph({
        space: { after: 200 },
        children: [
          new TextRun({
            text: personalInfo.summary,
            size: 20, // 10pt
            color: "1E293B",
            font: "Arial",
          }),
        ],
      })
    );
  }

  // Work Experience
  if (workExperience.length > 0) {
    addSectionHeader("Work Experience");
    for (const exp of workExperience) {
      const dates = `${exp.startDate} – ${exp.isCurrent ? "Present" : exp.endDate || ""}`;
      const location = exp.location ? ` | ${exp.location}` : "";

      children.push(
        new Paragraph({
          space: { before: 140, after: 40 },
          children: [
            new TextRun({
              text: exp.jobTitle,
              bold: true,
              size: 20,
              color: "0F172A",
              font: "Arial",
            }),
            new TextRun({
              text: ` — ${exp.employer}${location}`,
              size: 20,
              color: "334155",
              font: "Arial",
            }),
            new TextRun({
              text: ` (${dates})`,
              size: 18,
              italics: true,
              color: "64748B",
              font: "Arial",
            }),
          ],
        })
      );

      if (exp.description) {
        const lines = exp.description.split("\n");
        for (const line of lines) {
          const cleanLine = line.replace(/^[•\-\*]\s*/, "");
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              space: { after: 40 },
              children: [
                new TextRun({
                  text: cleanLine,
                  size: 19,
                  color: "334155",
                  font: "Arial",
                }),
              ],
            })
          );
        }
      }
    }
  }

  // Education
  if (education.length > 0) {
    addSectionHeader("Education");
    for (const edu of education) {
      children.push(
        new Paragraph({
          space: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: edu.degree,
              bold: true,
              size: 20,
              color: "0F172A",
              font: "Arial",
            }),
            new TextRun({
              text: ` — ${edu.institution}`,
              size: 20,
              color: "334155",
              font: "Arial",
            }),
            new TextRun({
              text: ` (${edu.endDate || ""})`,
              size: 18,
              italics: true,
              color: "64748B",
              font: "Arial",
            }),
          ],
        })
      );
      if (edu.grade) {
        children.push(
          new Paragraph({
            space: { after: 40 },
            children: [
              new TextRun({
                text: `Grade: ${edu.grade}`,
                size: 18,
                italics: true,
                color: "475569",
                font: "Arial",
              }),
            ],
          })
        );
      }
    }
  }

  // Skills
  if (skills.length > 0) {
    addSectionHeader("Skills & Competencies");
    const skillList = skills.map((s) => `${s.name} (${s.category})`).join("  •  ");
    children.push(
      new Paragraph({
        space: { after: 140 },
        children: [
          new TextRun({
            text: skillList,
            size: 19,
            color: "334155",
            font: "Arial",
          }),
        ],
      })
    );
  }

  // Languages
  if (languages.length > 0) {
    addSectionHeader("Languages");
    const langList = languages.map((l) => `${l.language}: ${l.proficiency}`).join("  |  ");
    children.push(
      new Paragraph({
        space: { after: 140 },
        children: [
          new TextRun({
            text: langList,
            size: 19,
            color: "334155",
            font: "Arial",
          }),
        ],
      })
    );
  }

  // Certifications
  if (certifications.length > 0) {
    addSectionHeader("Certifications & Credentials");
    for (const cert of certifications) {
      children.push(
        new Paragraph({
          space: { after: 60 },
          children: [
            new TextRun({
              text: cert.title,
              bold: true,
              size: 19,
              color: "0F172A",
              font: "Arial",
            }),
            new TextRun({
              text: ` — ${cert.issuer} (${cert.issueDate})`,
              size: 18,
              color: "475569",
              font: "Arial",
            }),
          ],
        })
      );
    }
  }

  // Projects
  if (projects.length > 0) {
    addSectionHeader("Projects & Key Achievements");
    for (const proj of projects) {
      children.push(
        new Paragraph({
          space: { before: 80, after: 40 },
          children: [
            new TextRun({
              text: proj.title,
              bold: true,
              size: 19,
              color: "0F172A",
              font: "Arial",
            }),
            proj.role
              ? new TextRun({
                  text: ` (${proj.role})`,
                  italics: true,
                  size: 18,
                  color: "64748B",
                  font: "Arial",
                })
              : new TextRun({ text: "" }),
          ],
        })
      );
      if (proj.description) {
        children.push(
          new Paragraph({
            space: { after: 60 },
            children: [
              new TextRun({
                text: proj.description,
                size: 18,
                color: "334155",
                font: "Arial",
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
