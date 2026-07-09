"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";
import { LabCompareTable } from "./LabCompareTable";
import { LabSheet } from "./types";

interface SessionLabResultsProps {
  /** Every sheet the patient has — not just this session's — so values compare. */
  sheets: LabSheet[];
  /** Session being viewed, whose column gets highlighted. Absent while creating one. */
  currentSessionId?: string;
}

/**
 * Read-only lab results shown inside a session. Sheets are added from the
 * patient's Lab Results tab, never from here.
 */
export function SessionLabResults({
  sheets,
  currentSessionId,
}: SessionLabResultsProps) {
  const t = useTranslations("session");
  const tLab = useTranslations("patientTabs.labTab");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          <CardTitle className="text-base">{t("labResults")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {sheets.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            {tLab("noSheets")}
          </p>
        ) : (
          <LabCompareTable
            sheets={sheets}
            highlightSessionId={currentSessionId}
          />
        )}
      </CardContent>
    </Card>
  );
}
