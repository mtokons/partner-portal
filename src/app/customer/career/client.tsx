"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { submitCareerSurveyAction } from "./actions";
import type { CareerSuggestion, CareerSurveyInput } from "@/lib/ai-career";

interface Props {
  initial: CareerSurveyInput | null;
  initialSuggestions: CareerSuggestion[];
  initialProfileSummary: string | null;
}

function csvToList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function CareerSurveyClient({ initial, initialSuggestions, initialProfileSummary }: Props) {
  const [currentRole, setCurrentRole] = useState(initial?.currentRole ?? "");
  const [yearsExperience, setYearsExperience] = useState(initial?.yearsExperience ?? 0);
  const [education, setEducation] = useState((initial?.education ?? []).join(", "));
  const [skills, setSkills] = useState((initial?.skills ?? []).join(", "));
  const [goals, setGoals] = useState((initial?.goals ?? []).join(", "));
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [suggestions, setSuggestions] = useState<CareerSuggestion[]>(initialSuggestions);
  const [profileSummary, setProfileSummary] = useState<string | null>(initialProfileSummary);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await submitCareerSurveyAction({
          currentRole,
          yearsExperience: Number(yearsExperience) || 0,
          education: csvToList(education),
          skills: csvToList(skills),
          goals: csvToList(goals),
          industry,
        });
        setSuggestions(res.suggestions);
        setProfileSummary(res.profileSummary);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="role">Current role</Label>
              <Input id="role" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
            <div>
              <Label htmlFor="yrs">Years of experience</Label>
              <Input id="yrs" type="number" min={0} max={80} value={yearsExperience} onChange={(e) => setYearsExperience(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Education, Tech" />
            </div>
            <div>
              <Label htmlFor="edu">Education (comma separated)</Label>
              <Input id="edu" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. BSc Computer Science" />
            </div>
            <div>
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. JavaScript, React, German" />
            </div>
            <div>
              <Label htmlFor="goals">Goals (comma separated)</Label>
              <Input id="goals" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. learn German, study abroad" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Generating..." : "Get suggestions"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileSummary && (
            <div className="text-sm bg-muted p-3 rounded">{profileSummary}</div>
          )}
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Submit the form to see your personalised recommendations.</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s, i) => (
                <li key={i} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{s.productName}</p>
                      <p className="text-xs text-muted-foreground">{s.category}</p>
                    </div>
                    <Badge>{Math.round(s.score * 100)}%</Badge>
                  </div>
                  <p className="text-sm mt-2">{s.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
