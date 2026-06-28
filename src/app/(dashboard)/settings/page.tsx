import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClinics } from "@/actions/appointments";
import { getUsers } from "@/actions/settings";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [clinics, users] = await Promise.all([getClinics(), getUsers()]);

  return (
    <SettingsPageClient
      clinics={clinics}
      users={users}
      currentUserRole={user.role}
      currentUserId={user.id}
    />
  );
}
