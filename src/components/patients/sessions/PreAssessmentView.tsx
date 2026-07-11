"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Stethoscope } from "lucide-react";

// The assistant's pre-assessment, shown read-only to the doctor. Rendered while
// he writes the session (the current visit's, still unclaimed) and inside a
// saved session detail (the one that session claimed). His vitals are kept
// separate from the doctor's own on the Session — never merged — so the record
// says who measured what.
export interface PreAssessmentLike {
  bloodPressure: string | null;
  pulse: string | null;
  temperature: string | null;
  respRate: string | null;
  examination: string | null;
  assistant?: { name: string } | null;
}

function Vital({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value || "—"}</div>
    </div>
  );
}

export function PreAssessmentView({ pre }: { pre: PreAssessmentLike }) {
  const t = useTranslations("session");
  const hasVitals =
    pre.bloodPressure || pre.pulse || pre.temperature || pre.respRate;

  return (
    <Card className="border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-base">{t("preAssessment")}</CardTitle>
          {pre.assistant?.name && (
            <span className="text-xs text-muted-foreground ms-auto">
              {t("preAssessmentBy", { name: pre.assistant.name })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasVitals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Vital label={t("bloodPressure")} value={pre.bloodPressure} />
            <Vital label={t("pulse")} value={pre.pulse} />
            <Vital label={t("temperature")} value={pre.temperature} />
            <Vital label={t("respRate")} value={pre.respRate} />
          </div>
        )}
        {pre.examination && (
          <>
            {hasVitals && <Separator className="my-4" />}
            <div>
              <h4 className="text-sm font-medium mb-1">{t("examination")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {pre.examination}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
