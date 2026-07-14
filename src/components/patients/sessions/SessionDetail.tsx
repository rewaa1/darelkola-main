"use client";

import { useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Printer,
  Activity,
  Pill,
  FlaskConical,
} from "lucide-react";
import { toggleSessionMedication } from "@/actions/sessions";
import { setInvestigationResulted } from "@/actions/investigations";
import { SessionWithRelations } from "./types";
import { SessionLabResults } from "../lab/SessionLabResults";
import { PreAssessmentView } from "./PreAssessmentView";
import { printInvestigations } from "./print-investigations";
import { LabSheet } from "../lab/types";

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
  patientName: string;
  labSheets: LabSheet[];
  onBack: () => void;
  onPrint: () => void;
  // The assistant may read a past session but not change what it prescribes.
  readOnly?: boolean;
}

export function SessionDetail({
  session,
  patientName,
  labSheets,
  onBack,
  onPrint,
  readOnly = false,
}: SessionDetailProps) {
  const t = useTranslations("session");
  const tCat = useTranslations("investCategories");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();

  const investigations = session.sessionInvestigations ?? [];

  const handleToggle = (smId: string, active: boolean) => {
    startTransition(async () => {
      await toggleSessionMedication(smId, active);
    });
  };

  const handleResulted = (id: string, resulted: boolean) => {
    startTransition(async () => {
      await setInvestigationResulted(id, resulted);
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
        {!readOnly && (
          <div className="flex gap-2">
            {investigations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => printInvestigations(session, patientName)}
              >
                <FlaskConical className="h-4 w-4 me-2" />
                {t("printRequests")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 me-2" />
              {t("printRx")}
            </Button>
          </div>
        )}
      </div>

      {/* Assistant's pre-assessment, if this visit had one — read-only, above
          the doctor's own record, never merged into it. */}
      {session.preAssessment && (
        <PreAssessmentView pre={session.preAssessment} />
      )}

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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
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
                      disabled={isPending || readOnly}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requested investigations — what the doctor asked the patient to get,
          each markable resulted as the results come back */}
      {investigations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              <CardTitle className="text-base">
                {t("requestedInvestigations")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {investigations.map((inv) => {
                const resulted = inv.status === "RESULTED";
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg border gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {tCat(inv.investigation.category)}
                        </Badge>
                        <span className="font-medium text-sm">
                          {inv.investigation.name}
                        </span>
                      </div>
                      {inv.notes && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t("note")}: {inv.notes}
                        </div>
                      )}
                      {resulted && inv.resultedAt && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t("resultedOn", {
                            date: format.dateTime(new Date(inv.resultedAt), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }),
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {resulted ? t("resulted") : t("pending")}
                      </span>
                      <Switch
                        checked={resulted}
                        onCheckedChange={(checked) =>
                          handleResulted(inv.id, checked)
                        }
                        disabled={isPending || readOnly}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab results — the patient's full history, this session's column marked */}
      <SessionLabResults sheets={labSheets} currentSessionId={session.id} />
    </div>
  );
}
