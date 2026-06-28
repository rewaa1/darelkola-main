import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NewPatientForm } from "./NewPatientForm";

export default async function NewPatientPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("newPatient");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <NewPatientForm />
    </div>
  );
}
