import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClinics } from "@/actions/appointments";
import { AppointmentsPageClient } from "./AppointmentsPageClient";

export default async function AppointmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const clinics = await getClinics();

  return <AppointmentsPageClient clinics={clinics} />;
}
