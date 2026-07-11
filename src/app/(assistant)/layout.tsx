import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssistantShell } from "@/components/assistant/AssistantShell";

export default async function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // This surface is the assistant's alone. Doctors and receptionists have the
  // full dashboard; send them there rather than showing a stripped view.
  if (user.role !== "ASSISTANT") {
    redirect("/dashboard");
  }

  return (
    <AssistantShell user={{ name: user.name || "Assistant" }}>
      {children}
    </AssistantShell>
  );
}
