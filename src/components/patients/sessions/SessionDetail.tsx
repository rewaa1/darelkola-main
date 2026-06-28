"use client";

import { useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  Printer,
  Activity,
  Pill,
  FlaskConical,
} from "lucide-react";
import { toggleSessionMedication } from "@/actions/sessions";
import { SessionWithRelations } from "./types";
import { InvestigationSheetView } from "./InvestigationSheetView";

function VitalCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value || "—"}</div>
    </div>
  );
}

interface SessionDetailProps {
  session: SessionWithRelations;
  onBack: () => void;
  onPrint: () => void;
}

export function SessionDetail({
  session,
  onBack,
  onPrint,
}: SessionDetailProps) {
  const t = useTranslations("session");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (smId: string, active: boolean) => {
    startTransition(async () => {
      await toggleSessionMedication(smId, active);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
          {t("backToSessions")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 me-2" />
            {t("printRx")}
          </Button>
        </div>
      </div>

      {/* Vitals */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <CardTitle className="text-base">
              {t("sessionOn", {
                date: format.dateTime(new Date(session.date), {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }),
              })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <VitalCard
              label={t("bloodPressure")}
              value={session.bloodPressure}
            />
            <VitalCard label={t("pulse")} value={session.pulse} />
            <VitalCard label={t("temperature")} value={session.temperature} />
            <VitalCard label={t("respRate")} value={session.respRate} />
          </div>
          {session.examination && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="text-sm font-medium mb-1">
                  {t("examination")}
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {session.examination}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            <CardTitle className="text-base">{t("medications")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {session.sessionMedications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noMedsForSession")}
            </p>
          ) : (
            <div className="space-y-3">
              {session.sessionMedications.map((sm) => (
                <div
                  key={sm.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {sm.medication.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[sm.dosage, sm.frequency, sm.duration]
                        .filter(Boolean)
                        .join(" • ") || t("noDetails")}
                    </div>
                    {sm.notes && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t("note")}: {sm.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {sm.active ? t("active") : t("inactive")}
                    </span>
                    <Switch
                      checked={sm.active}
                      onCheckedChange={(checked) =>
                        handleToggle(sm.id, checked)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investigation Sheets */}
      {session.investigationSheets.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              <CardTitle className="text-base">{t("labResults")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.investigationSheets.map((sheet) => (
              <InvestigationSheetView key={sheet.id} sheet={sheet} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
