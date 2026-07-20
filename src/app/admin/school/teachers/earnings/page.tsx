import { getTeacherEarningsAction } from "../../actions";
import { TeacherEarningsClient } from "@/components/school/TeacherEarningsClient";

export default async function TeacherEarningsPage() {
  const earnings = await getTeacherEarningsAction();
  return <TeacherEarningsClient earnings={earnings} />;
}
