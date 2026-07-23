import jsPDF from "jspdf";
import type { CvData } from "@/types/cv-builder";

const COLOR_RGB: Record<string, [number, number, number]> = {
  blue: [30, 64, 175],
  emerald: [5, 150, 105],
  indigo: [79, 70, 229],
  crimson: [190, 18, 60],
  slate: [51, 65, 85],
  violet: [124, 58, 237],
};

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generateCvStudioPdf(cvData: CvData): Uint8Array {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const w = doc.internal.pageSize.getWidth(); // 210mm
  const accent = COLOR_RGB[cvData.settings.accentColor] || [30, 64, 175];
  const { personalInfo, workExperience, education, skills, languages, certifications, projects, settings } = cvData;

  const isZurich = settings.templateId === "zurich";
  const isMunich = settings.templateId === "munich";
  const isVienna = settings.templateId === "vienna";

  let y = 15;

  // ── Header Style ──────────────────────────────────────────
  if (isZurich) {
    // Left Accent Bar Header
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, 70, 297, "F");

    // Left Column Content (White text)
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(personalInfo.fullName, 10, 25, { maxWidth: 52 });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (personalInfo.jobTitle) {
      doc.text(personalInfo.jobTitle, 10, 38, { maxWidth: 52 });
    }

    let sideY = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CONTACT", 10, sideY);
    sideY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const sideContacts = [
      personalInfo.email,
      personalInfo.phone,
      personalInfo.location,
      personalInfo.linkedin,
      personalInfo.website,
    ].filter(Boolean);

    for (const c of sideContacts) {
      const splitLines = doc.splitTextToSize(c!, 52);
      doc.text(splitLines, 10, sideY);
      sideY += splitLines.length * 4.5;
    }

    // Languages in Sidebar
    if (languages.length > 0) {
      sideY += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("LANGUAGES", 10, sideY);
      sideY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const lang of languages) {
        doc.text(`${lang.language}: ${lang.proficiency}`, 10, sideY);
        sideY += 5;
      }
    }

    // Skills in Sidebar
    if (skills.length > 0) {
      sideY += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("SKILLS", 10, sideY);
      sideY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const s of skills) {
        doc.text(`• ${s.name}`, 10, sideY, { maxWidth: 52 });
        sideY += 5;
      }
    }

    // Main Column (X starting at 78mm)
    y = 20;

    const renderRightHeader = (title: string) => {
      y = ensureSpace(doc, y, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(title.toUpperCase(), 78, y);
      y += 2;
      doc.setDrawColor(accent[0], accent[1], accent[2]);
      doc.setLineWidth(0.5);
      doc.line(78, y, 200, y);
      y += 6;
    };

    if (personalInfo.summary) {
      renderRightHeader("Profile Summary");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(personalInfo.summary, 120);
      doc.text(lines, 78, y);
      y += lines.length * 4.5 + 4;
    }

    if (workExperience.length > 0) {
      renderRightHeader("Work Experience");
      for (const exp of workExperience) {
        y = ensureSpace(doc, y, 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(exp.jobTitle, 78, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const dateStr = `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || ""}`;
        doc.text(`${exp.employer} | ${dateStr}`, 78, y + 4.5);
        y += 9;

        if (exp.description) {
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          const descLines = doc.splitTextToSize(exp.description, 120);
          for (const line of descLines) {
            y = ensureSpace(doc, y, 5);
            doc.text(line, 78, y);
            y += 4.2;
          }
          y += 3;
        }
      }
    }

    if (education.length > 0) {
      renderRightHeader("Education");
      for (const edu of education) {
        y = ensureSpace(doc, y, 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(edu.degree, 78, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`${edu.institution} (${edu.endDate || ""})`, 78, y + 4);
        y += 8;
      }
    }
  } else {
    // ── Traditional Top Header Layout (Berlin, Munich, Vienna) ──

    if (isVienna) {
      // Top Colored Banner
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(0, 0, w, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(personalInfo.fullName, 15, 16);

      if (personalInfo.jobTitle) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(personalInfo.jobTitle, 15, 22);
      }
      y = 35;
    } else if (isMunich) {
      // Centered Classic Layout
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.setFont("times", "bold");
      doc.setFontSize(22);
      doc.text(personalInfo.fullName, w / 2, y, { align: "center" });
      y += 6;

      if (personalInfo.jobTitle) {
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text(personalInfo.jobTitle, w / 2, y, { align: "center" });
        y += 6;
      }
    } else {
      // Berlin Standard ATS Layout
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(15, y, 4, 18, "F");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(personalInfo.fullName, 23, y + 6);

      if (personalInfo.jobTitle) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(personalInfo.jobTitle, 23, y + 12);
      }
      y += 22;
    }

    // Contact Line
    const contacts = [
      personalInfo.email,
      personalInfo.phone,
      personalInfo.location,
      personalInfo.linkedin,
      personalInfo.website,
    ].filter(Boolean);

    if (contacts.length > 0) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      const contactText = contacts.join("   |   ");

      if (isMunich) {
        doc.text(contactText, w / 2, y, { align: "center" });
      } else {
        doc.text(contactText, 15, y);
      }
      y += 6;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, w - 15, y);
    y += 8;

    const renderHeaderTitle = (title: string) => {
      y = ensureSpace(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(title.toUpperCase(), 15, y);
      y += 2;
      doc.setDrawColor(accent[0], accent[1], accent[2]);
      doc.setLineWidth(0.6);
      doc.line(15, y, 65, y);
      y += 7;
    };

    // Summary
    if (personalInfo.summary) {
      renderHeaderTitle("Professional Summary");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(personalInfo.summary, w - 30);
      doc.text(lines, 15, y);
      y += lines.length * 4.5 + 4;
    }

    // Experience
    if (workExperience.length > 0) {
      renderHeaderTitle("Work Experience");
      for (const exp of workExperience) {
        y = ensureSpace(doc, y, 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(exp.jobTitle, 15, y);

        const dateStr = `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || ""}`;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(dateStr, w - 15, y, { align: "right" });

        y += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const loc = exp.location ? ` | ${exp.location}` : "";
        doc.text(`${exp.employer}${loc}`, 15, y);
        y += 5.5;

        if (exp.description) {
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          const descLines = doc.splitTextToSize(exp.description, w - 30);
          for (const line of descLines) {
            y = ensureSpace(doc, y, 4.5);
            doc.text(line, 15, y);
            y += 4.2;
          }
          y += 3;
        }
      }
    }

    // Education
    if (education.length > 0) {
      renderHeaderTitle("Education & Training");
      for (const edu of education) {
        y = ensureSpace(doc, y, 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(edu.degree, 15, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(edu.endDate || "", w - 15, y, { align: "right" });

        y += 4.5;
        doc.text(edu.institution + (edu.grade ? ` — ${edu.grade}` : ""), 15, y);
        y += 6;
      }
    }

    // Skills & Languages (2 Columns)
    if (skills.length > 0 || languages.length > 0) {
      renderHeaderTitle("Skills & Languages");
      y = ensureSpace(doc, y, 20);

      const colW = (w - 36) / 2;

      // Skills column (left)
      let skY = y;
      if (skills.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text("Core Skills", 15, skY);
        skY += 5;

        for (const s of skills) {
          skY = ensureSpace(doc, skY, 5);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(`• ${s.name}`, 15, skY);

          // Level rating bar
          const barX = 15 + colW - 30;
          doc.setFillColor(226, 232, 240);
          doc.rect(barX, skY - 2.5, 25, 2.5, "F");
          doc.setFillColor(accent[0], accent[1], accent[2]);
          doc.rect(barX, skY - 2.5, (s.level / 5) * 25, 2.5, "F");

          skY += 5;
        }
      }

      // Languages column (right)
      let langY = y;
      if (languages.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text("Languages", 15 + colW + 6, langY);
        langY += 5;

        for (const l of languages) {
          langY = ensureSpace(doc, langY, 5);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(`• ${l.language}`, 15 + colW + 6, langY);
          doc.setFont("helvetica", "bold");
          doc.text(l.proficiency, w - 15, langY, { align: "right" });
          langY += 5;
        }
      }

      y = Math.max(skY, langY) + 4;
    }

    // Certifications
    if (certifications.length > 0) {
      renderHeaderTitle("Certifications");
      for (const cert of certifications) {
        y = ensureSpace(doc, y, 8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(cert.title, 15, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`${cert.issuer} (${cert.issueDate})`, w - 15, y, { align: "right" });
        y += 5.5;
      }
    }
  }

  // Footer on all pages
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated via SCCG CV Suite — ${personalInfo.fullName}`,
      isZurich ? 78 : 15,
      288
    );
    doc.text(`Page ${i} of ${pageCount}`, w - 15, 288, { align: "right" });
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
