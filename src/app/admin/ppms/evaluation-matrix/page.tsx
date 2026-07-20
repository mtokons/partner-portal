import EvaluationPageContent from "@/components/project-partner/EvaluationPageContent";

export const dynamic = "force-dynamic";

export default async function AdminEvaluationMatrixPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  return <EvaluationPageContent searchParams={searchParams} basePath="/admin/ppms/evaluation-matrix" />;
}
