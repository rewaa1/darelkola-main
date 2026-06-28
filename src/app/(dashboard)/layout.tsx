import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        name: user.name || "User",
        email: user.email || "",
        role: user.role || "RECEPTIONIST",
      }}
    >
      {children}
    </DashboardShell>
  );
}
