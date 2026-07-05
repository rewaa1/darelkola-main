import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClinics } from "@/actions/appointments";
import { getUsers } from "@/actions/settings";
import { getReceptionists } from "@/actions/receptionists";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [clinics, users, receptionists] = await Promise.all([
    getClinics(),
    getUsers(),
    getReceptionists(),
  ]);

  return (
    <SettingsPageClient
      clinics={clinics}
      users={users}
      receptionists={receptionists}
      currentUserRole={user.role}
      currentUserId={user.id}
    />
  );
}
