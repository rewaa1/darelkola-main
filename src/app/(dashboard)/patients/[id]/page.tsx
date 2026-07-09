import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPatient } from "@/actions/patients";
import { getClinics } from "@/actions/appointments";
import { PatientProfile } from "./PatientProfile";

interface PatientPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function PatientPage({
  params,
  searchParams,
}: PatientPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const [patient, clinics] = await Promise.all([getPatient(id), getClinics()]);

  if (!patient) {
    notFound();
  }

  return (
    <PatientProfile patient={patient} clinics={clinics} initialTab={tab} />
  );
}
