import EvaluationPageContent from "@/components/project-partner/EvaluationPageContent";

export const dynamic = "force-dynamic";

export default async function EvaluationPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  return <EvaluationPageContent searchParams={searchParams} basePath="/project-partner/evaluation" />;
}
