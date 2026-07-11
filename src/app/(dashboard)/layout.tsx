import { getCurrentUser } from "@/lib/auth";
import { getActiveReceptionists } from "@/actions/receptionists";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReceptionistProvider } from "@/components/receptionist/ReceptionistProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // The assistant has his own restricted surface; keep him out of the full app.
  if (user.role === "ASSISTANT") {
    redirect("/assistant");
  }

  const receptionists = await getActiveReceptionists();

  return (
    <DashboardShell
      user={{
        name: user.name || "User",
        email: user.email || "",
        role: user.role || "RECEPTIONIST",
      }}
    >
      <ReceptionistProvider
        promptRequired={user.role === "RECEPTIONIST"}
        receptionists={receptionists}
      >
        {children}
      </ReceptionistProvider>
    </DashboardShell>
  );
}
