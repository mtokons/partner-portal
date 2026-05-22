"use client";

import { useState, useMemo, useEffect } from "react";
import type { WorkflowCategory, Product } from "@/types";
import type { WizardState } from "../WizardShell";

type PersonalInfo = WizardState["personalInfo"];

interface Step2PersonalInfoProps {
  initialData: PersonalInfo;
  products: Product[];
  onNext: (data: PersonalInfo) => void;
  onBack: () => void;
}

const REQUIRED: (keyof PersonalInfo)[] = [
  "fullName", "dateOfBirth", "email", "phone", "nationality", "country", "workflowCategory",
];

export function Step2PersonalInfo({ initialData, products, onNext, onBack }: Step2PersonalInfoProps) {
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return cats.length > 0 ? (cats as WorkflowCategory[]) : ["Training", "Ausbildung", "Student Visa", "Opportunity Card"] as WorkflowCategory[];
  }, [products]);

  const [form, setForm] = useState<PersonalInfo>(() => ({
    ...initialData,
    workflowCategory: initialData.workflowCategory || categories[0],
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfo, string>>>({});

  function set<K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate() {
    const errs: typeof errors = {};
    for (const key of REQUIRED) {
      if (!form[key]) errs[key] = "Required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email";
    }
    return errs;
  }

  function handleNext() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext(form);
  }

  function field(label: string, key: keyof PersonalInfo, type = "text", placeholder = "") {
    return (
      <div key={key}>
        <label className="block text-sm font-medium mb-1">
          {label}
          {REQUIRED.includes(key) && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type={type}
          value={(form[key] as string) ?? ""}
          onChange={(e) => set(key, e.target.value as PersonalInfo[typeof key])}
          placeholder={placeholder}
          className={`w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            errors[key] ? "border-red-400" : ""
          }`}
        />
        {errors[key] && <p className="text-xs text-red-500 mt-0.5">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Personal Information</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter the candidate's personal details.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field("Full Name", "fullName", "text", "John Doe")}
        {field("Date of Birth", "dateOfBirth", "date")}
        {field("Email", "email", "email", "john@example.com")}
        {field("Phone", "phone", "tel", "+880…")}
        {field("Nationality", "nationality", "text", "Bangladeshi")}
        {field("Country of Residence", "country", "text", "Bangladesh")}
        {field("Passport Number", "passportNumber", "text", "A0000000")}
        {field("National ID", "nationalId", "text")}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Address
        </label>
        <textarea
          rows={2}
          value={form.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Workflow Category <span className="text-red-500">*</span>
        </label>
        <select
          value={form.workflowCategory}
          onChange={(e) => set("workflowCategory", e.target.value as WorkflowCategory)}
          className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.workflowCategory && (
          <p className="text-xs text-red-500 mt-0.5">{errors.workflowCategory}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
