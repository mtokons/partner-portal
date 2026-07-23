export type CvTemplateId = "berlin" | "zurich" | "munich" | "vienna";

export type CvAccentColor =
  | "blue"
  | "emerald"
  | "indigo"
  | "crimson"
  | "slate"
  | "violet";

export type CvFontFamily = "inter" | "serif" | "mono" | "outfit";

export interface CvWorkExperience {
  id: string;
  jobTitle: string;
  employer: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
}

export interface CvEducation {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  startDate?: string;
  endDate: string;
  grade?: string;
  description?: string;
}

export interface CvSkill {
  id: string;
  name: string;
  category: "Technical" | "Soft" | "Tools" | "Other";
  level: 1 | 2 | 3 | 4 | 5; // 1-5 rating
}

export interface CvLanguage {
  id: string;
  language: string;
  proficiency: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";
}

export interface CvCertification {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface CvProject {
  id: string;
  title: string;
  role?: string;
  description: string;
  technologies?: string;
  link?: string;
}

export interface CvData {
  id?: string;
  candidateId?: string;
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    linkedin?: string;
    github?: string;
    photoUrl?: string;
    summary: string;
  };
  workExperience: CvWorkExperience[];
  education: CvEducation[];
  skills: CvSkill[];
  languages: CvLanguage[];
  certifications: CvCertification[];
  projects: CvProject[];
  settings: {
    templateId: CvTemplateId;
    accentColor: CvAccentColor;
    fontFamily: CvFontFamily;
    spacing: "compact" | "normal" | "spacious";
  };
}

export const DEFAULT_CV_DATA: CvData = {
  personalInfo: {
    fullName: "Johann Wolfgang von Goethe",
    jobTitle: "Senior Mechanical Engineer / Ausbildung Candidate",
    email: "johann.goethe@example.de",
    phone: "+49 176 12345678",
    location: "Hamburg, Germany",
    linkedin: "linkedin.com/in/johann-goethe",
    website: "github.com/johann-goethe",
    summary:
      "Results-driven Mechanical Engineering specialist with over 4 years of hands-on technical experience in CAD modeling, automation, and quality management. Passionate about participating in German Dual VET (Ausbildung) and contributing to modern industrial engineering.",
  },
  workExperience: [
    {
      id: "w1",
      jobTitle: "Mechanical Engineering Assistant",
      employer: "TechCorp Precision GmbH",
      location: "Frankfurt, Germany",
      startDate: "2023-01",
      endDate: "Present",
      isCurrent: true,
      description:
        "• Assisted senior engineers in designing 3D CAD components using SolidWorks and AutoCAD.\n• Conducted stress analysis and thermal simulation for high-precision components.\n• Optimized assembly line workflows, reducing material waste by 14%.",
    },
    {
      id: "w2",
      jobTitle: "Junior Quality Assurance Technician",
      employer: "Industrial Automation Solutions",
      location: "Hamburg, Germany",
      startDate: "2021-06",
      endDate: "2022-12",
      isCurrent: false,
      description:
        "• Performed dimensional inspections on mechanical parts using CMM equipment.\n• Documented quality control reports adhering to ISO 9001 standards.\n• Collaborated with cross-functional teams to troubleshoot mechanical defects.",
    },
  ],
  education: [
    {
      id: "e1",
      degree: "B.Sc. in Mechanical Engineering",
      institution: "Technical University of Hamburg",
      location: "Hamburg, Germany",
      startDate: "2018-10",
      endDate: "2022-05",
      grade: "1.8 (Sehr Gut)",
      description: "Specialized in Robotics, Automation Systems, and Fluid Mechanics.",
    },
  ],
  skills: [
    { id: "s1", name: "SolidWorks & AutoCAD", category: "Technical", level: 5 },
    { id: "s2", name: "CNC Machining & Tooling", category: "Technical", level: 4 },
    { id: "s3", name: "PLC Programming (Siemens S7)", category: "Technical", level: 4 },
    { id: "s4", name: "Quality Assurance (ISO 9001)", category: "Technical", level: 4 },
    { id: "s5", name: "Problem Solving & Analytical Thinking", category: "Soft", level: 5 },
  ],
  languages: [
    { id: "l1", language: "German", proficiency: "B2" },
    { id: "l2", language: "English", proficiency: "C1" },
  ],
  certifications: [
    {
      id: "c1",
      title: "Goethe-Zertifikat B2 Deutsch",
      issuer: "Goethe-Institut",
      issueDate: "2024-03",
    },
    {
      id: "c2",
      title: "Certified SolidWorks Professional (CSWP)",
      issuer: "Dassault Systèmes",
      issueDate: "2023-08",
    },
  ],
  projects: [
    {
      id: "p1",
      title: "Automated Robotic Arm Assembly",
      role: "Lead Designer",
      description:
        "Designed and fabricated a 4-axis robotic arm prototype powered by stepper motors and controlled via Siemens S7 PLC.",
      technologies: "SolidWorks, Siemens S7, C++",
    },
  ],
  settings: {
    templateId: "berlin",
    accentColor: "blue",
    fontFamily: "inter",
    spacing: "normal",
  },
};
