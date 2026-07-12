"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Medication } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Pill, FlaskConical, Plus } from "lucide-react";
import { SessionWithRelations } from "./sessions/types";
import { LabSheet } from "./lab/types";
import { SessionDetail } from "./sessions/SessionDetail";
import { AddSessionForm } from "./sessions/AddSessionForm";
import { PreAssessmentLike } from "./sessions/PreAssessmentView";
import { printPrescription } from "./sessions/print-rx";

interface SessionsTabProps {
  patientId: string;
  patientName: string;
  sessions: SessionWithRelations[];
  labSheets: LabSheet[];
  lastClinicId: string | null;
  clinics: { id: string; name: string }[];
  // Present only in the queue's current-patient view: the visit being worked
  // and its (still-unclaimed) assistant pre-assessment. The doctor's session
  // claims this visit when created.
  appointmentId?: string;
  currentPreAssessment?: PreAssessmentLike | null;
  // The assistant views past sessions for context but cannot create one or
  // change what a prescription prints — that is the doctor's alone.
  readOnly?: boolean;
}

type View = "list" | "detail" | "create";

export function SessionsTab({
  patientId,
  patientName,
  sessions,
  labSheets,
  lastClinicId,
  clinics,
  appointmentId,
  currentPreAssessment,
  readOnly = false,
}: SessionsTabProps) {
  const t = useTranslations("patientTabs.sessionsTab");
  const format = useFormatter();
  const [view, setView] = useState<View>("list");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const lastSession = sessions[0]; // sorted desc

  // Collect all medications across sessions with active status from latest session
  const allMedsMap = new Map<
    string,
    { medication: Medication; activeInLast: boolean }
  >();
  sessions.forEach((s) =>
    s.sessionMedications.forEach((sm) => {
      if (!allMedsMap.has(sm.medicationId)) {
        allMedsMap.set(sm.medicationId, {
          medication: sm.medication,
          activeInLast: false,
        });
      }
    }),
  );
  if (lastSession) {
    lastSession.sessionMedications.forEach((sm) => {
      if (sm.active && allMedsMap.has(sm.medicationId)) {
        allMedsMap.get(sm.medicationId)!.activeInLast = true;
      }
    });
  }
  const allMeds = Array.from(allMedsMap.values());

  // Print the A5 prescription positioned to match the physical Rx paper.
  const handlePrint = (session: SessionWithRelations) =>
    printPrescription(session, patientName);

  // CREATE view — full layout form
  if (view === "create") {
    return (
      <AddSessionForm
        patientId={patientId}
        patientName={patientName}
        sessions={sessions}
        labSheets={labSheets}
        lastClinicId={lastClinicId}
        clinics={clinics}
        appointmentId={appointmentId}
        currentPreAssessment={currentPreAssessment}
        onCancel={() => setView("list")}
      />
    );
  }

  // DETAIL view
  if (view === "detail" && selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        labSheets={labSheets}
        readOnly={readOnly}
        onBack={() => {
          setView("list");
          setSelectedSessionId(null);
        }}
        onPrint={() => handlePrint(selectedSession)}
      />
    );
  }

  // LIST view
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Sessions List */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("title")}</CardTitle>
            {!readOnly && (
              <div className="flex gap-2">
                {lastSession && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(lastSession)}
                  >
                    <Printer className="h-4 w-4 me-2" />
                    {t("printLastRx")}
                  </Button>
                )}
                <Button size="sm" onClick={() => setView("create")}>
                  <Plus className="h-4 w-4 me-2" />
                  {t("newSession")}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("noSessions")}
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const activeCount = session.sessionMedications.filter(
                    (sm) => sm.active,
                  ).length;
                  return (
                    <button
                      key={session.id}
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setView("detail");
                      }}
                      className="w-full text-start p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {format.dateTime(new Date(session.date), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {session.examination || t("noExamNotes")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeCount > 0 && (
                            <Badge variant="secondary">
                              <Pill className="h-3 w-3 me-1" />
                              {activeCount}
                            </Badge>
                          )}
                          {session.investigationSheets.length > 0 && (
                            <Badge variant="outline">
                              <FlaskConical className="h-3 w-3 me-1" />
                              {session.investigationSheets.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Vitals summary */}
                      {(session.bloodPressure || session.pulse) && (
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          {session.bloodPressure && (
                            <span>
                              {t("bpShort")}: {session.bloodPressure}
                            </span>
                          )}
                          {session.pulse && (
                            <span>
                              {t("pulseShort")}: {session.pulse}
                            </span>
                          )}
                          {session.temperature && (
                            <span>
                              {t("tempShort")}: {session.temperature}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medications Sidebar */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("allMedications")}</CardTitle>
          </CardHeader>
          <CardContent>
            {allMeds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noMedsPrescribed")}
              </p>
            ) : (
              <div className="space-y-2">
                {allMeds.map(({ medication, activeInLast }) => (
                  <div
                    key={medication.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span
                      className={
                        activeInLast ? "font-medium" : "text-muted-foreground"
                      }
                    >
                      {medication.name}
                    </span>
                    {activeInLast && (
                      <Badge
                        variant="default"
                        className="text-xs bg-emerald-600"
                      >
                        {t("active")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
