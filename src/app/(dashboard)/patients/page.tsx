import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PatientsPageClient } from "./PatientsPageClient";

export default async function PatientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <PatientsPageClient />;
}
