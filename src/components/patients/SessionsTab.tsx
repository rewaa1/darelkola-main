"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Medication } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Pill, FlaskConical, Plus } from "lucide-react";
import { SessionWithRelations } from "./sessions/types";
import { SessionDetail } from "./sessions/SessionDetail";
import { AddSessionForm } from "./sessions/AddSessionForm";

interface SessionsTabProps {
  patientId: string;
  patientName: string;
  sessions: SessionWithRelations[];
  lastClinicId: string | null;
  clinics: { id: string; name: string }[];
}

type View = "list" | "detail" | "create";

export function SessionsTab({
  patientId,
  patientName,
  sessions,
  lastClinicId,
  clinics,
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

  // Print handler — A5 prescription positioned to match physical Rx paper
  const handlePrint = (session: SessionWithRelations) => {
    const activeMeds = session.sessionMedications.filter((sm) => sm.active);
    const sessionDate = new Date(session.date);
    const day = sessionDate.getDate().toString().padStart(2, "0");
    const month = (sessionDate.getMonth() + 1).toString().padStart(2, "0");
    const year = sessionDate.getFullYear();

    const medsHtml = activeMeds
      .map(
        (sm, i) =>
          `<div class="med-row">
            <span class="med-num">${i + 1}.</span>
            <span class="med-name">${sm.medication.name}</span>
            ${sm.dosage || sm.medication.dosage ? `<span class="med-detail">${sm.dosage || sm.medication.dosage}</span>` : ""}
            ${sm.frequency ? `<span class="med-detail">${sm.frequency}</span>` : ""}
            ${sm.duration ? `<span class="med-detail">(${sm.duration})</span>` : ""}
            ${sm.notes ? `<div class="med-notes">${sm.notes}</div>` : ""}
          </div>`,
      )
      .join("");

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rx - ${patientName}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 0;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: 148mm;
              height: 210mm;
              position: relative;
              font-family: 'Segoe UI', Tahoma, sans-serif;
              background-image: url('/rx-template.png');
              background-size: 148mm 210mm;
              background-repeat: no-repeat;
              background-position: top left;
            }
            @media print {
              body {
                background-image: none !important;
              }
            }

            /* Patient name — aligned to the "Name:" line */
            .patient-name {
              position: absolute;
              top: 48.5mm;
              left: 25mm;
              max-width: 70mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 13pt;
              font-weight: 600;
            }

            /* Date — aligned to the "Date: / /" area */
            .date-field {
              position: absolute;
              top: 50.5mm;
              right: 15mm;
              font-size: 8pt;
              direction: ltr;
              letter-spacing: 1.5mm;
            }

            /* Medications list — below the Rx/ symbol */
            .meds-list {
              position: absolute;
              top: 75mm;
              left: 14mm;
              right: 12mm;
            }
            .med-row {
              margin-bottom: 4mm;
              font-size: 12pt;
              line-height: 1.5;
            }
            .med-num {
              display: inline-block;
              width: 8mm;
              font-weight: 600;
            }
            .med-name {
              font-weight: 600;
              margin-right: 3mm;
            }
            .med-detail {
              color: #333;
              margin-right: 3mm;
            }
            .med-notes {
              margin-left: 8mm;
              font-size: 10pt;
              color: #555;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="patient-name">${patientName}</div>
          <div class="date-field">${day}  ${month}  ${year}</div>
          <div class="meds-list">${medsHtml}</div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(printContent);
      win.document.close();
      // Small delay so the background image loads before print dialog
      setTimeout(() => win.print(), 300);
    }
  };

  // CREATE view — full layout form
  if (view === "create") {
    return (
      <AddSessionForm
        patientId={patientId}
        sessions={sessions}
        lastClinicId={lastClinicId}
        clinics={clinics}
        onCancel={() => setView("list")}
      />
    );
  }

  // DETAIL view
  if (view === "detail" && selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
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
                      className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
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
                              <Pill className="h-3 w-3 mr-1" />
                              {activeCount}
                            </Badge>
                          )}
                          {session.investigationSheets.length > 0 && (
                            <Badge variant="outline">
                              <FlaskConical className="h-3 w-3 mr-1" />
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
