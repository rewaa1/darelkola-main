import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPatient } from "@/actions/patients";
import { getClinics } from "@/actions/appointments";
import { PatientProfile } from "./PatientProfile";

interface PatientPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientPage({ params }: PatientPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [patient, clinics] = await Promise.all([getPatient(id), getClinics()]);

  if (!patient) {
    notFound();
  }

  return <PatientProfile patient={patient} clinics={clinics} />;
}
