import { getClinics, getTodayQueue } from "@/actions/appointments";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QueuePageClient } from "./QueuePageClient";

export default async function QueuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const clinics = await getClinics();

  if (clinics.length === 0) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold">No Clinics Found</h1>
        <p className="text-muted-foreground">Please set up clinics first.</p>
      </div>
    );
  }

  // Pre-fetch queue data for the first clinic
  const initialClinicId = clinics[0].id;
  const initialQueueData = await getTodayQueue(initialClinicId);

  return (
    <QueuePageClient
      clinics={clinics}
      initialClinicId={initialClinicId}
      initialData={initialQueueData}
    />
  );
}
