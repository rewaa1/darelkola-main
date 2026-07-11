import { getClinics, getTodayQueue } from "@/actions/appointments";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssistantQueueClient } from "@/components/assistant/AssistantQueueClient";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ASSISTANT") redirect("/dashboard");

  const clinics = await getClinics();

  if (clinics.length === 0) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold">No Clinics Found</h1>
        <p className="text-muted-foreground">Please set up clinics first.</p>
      </div>
    );
  }

  const initialClinicId = clinics[0].id;
  const initialData = await getTodayQueue(initialClinicId);

  return (
    <AssistantQueueClient
      clinics={clinics}
      initialClinicId={initialClinicId}
      initialData={initialData}
    />
  );
}
