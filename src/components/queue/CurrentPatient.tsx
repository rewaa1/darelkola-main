"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Appointment,
  Patient,
  PersonalHistory,
  PreviousMedication,
  Investigation,
  Session,
  SessionMedication,
  Medication,
  InvestigationSheet,
  ExtraInvestigation,
  Clinic,
} from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Check,
  Stethoscope,
  Calendar,
  Loader2,
} from "lucide-react";
import { differenceInYears } from "date-fns";
import { getPatient } from "@/actions/patients";
import { getPreAssessmentForAppointment } from "@/actions/pre-assessments";

import { PersonalInfoTab } from "@/components/patients/PersonalInfoTab";
import { HistoryTab } from "@/components/patients/HistoryTab";
import { ExaminationTab } from "@/components/patients/ExaminationTab";
import { MedicationsTab } from "@/components/patients/MedicationsTab";
import { InvestigationsTab } from "@/components/patients/InvestigationsTab";
import { LabResultsTab } from "@/components/patients/LabResultsTab";
import { SessionsTab } from "@/components/patients/SessionsTab";
import { AppointmentsTab } from "@/components/patients/AppointmentsTab";
import { LabSheet } from "@/components/patients/lab/types";

type SessionWithRelations = Session & {
  sessionMedications: (SessionMedication & { medication: Medication })[];
  investigationSheets: (InvestigationSheet & {
    extraInvestigations: ExtraInvestigation[];
  })[];
};

type PatientWithRelations = Patient & {
  personalHistory: PersonalHistory | null;
  previousMedications: PreviousMedication[];
  investigations: Investigation[];
  investigationSheets: LabSheet[];
  sessions: SessionWithRelations[];
  appointments: (Appointment & { clinic: Clinic })[];
};

interface CurrentPatientProps {
  appointment: Appointment | null;
  onComplete: () => void;
  clinics: { id: string; name: string }[];
}

export function CurrentPatient({
  appointment,
  onComplete,
  clinics,
}: CurrentPatientProps) {
  const t = useTranslations("queue");
  const tTabs = useTranslations("tabs");
  const [patient, setPatient] = useState<PatientWithRelations | null>(null);
  const [preAssessment, setPreAssessment] = useState<Awaited<
    ReturnType<typeof getPreAssessmentForAppointment>
  > | null>(null);
  const [isPending, startTransition] = useTransition();

  const patientId = appointment?.patientId ?? null;
  const appointmentId = appointment?.id ?? null;

  // The patient lives in local state, so revalidatePath from a server action
  // cannot reach it. Tabs that mutate patient data call this to reload.
  const loadPatient = useCallback(() => {
    if (!patientId) {
      startTransition(() => setPatient(null));
      return;
    }
    startTransition(async () => {
      try {
        const [p, pre] = await Promise.all([
          getPatient(patientId),
          appointmentId
            ? getPreAssessmentForAppointment(appointmentId)
            : Promise.resolve(null),
        ]);
        setPatient(p);
        setPreAssessment(pre);
      } catch {
        setPatient(null);
      }
    });
  }, [patientId, appointmentId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  if (!appointment) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{t("noPatientWithDoctor")}</p>
          <p className="text-sm mt-1">{t("callFromWaiting")}</p>
        </CardContent>
      </Card>
    );
  }

  // Only render state that belongs to the appointment on screen. Without this,
  // calling the next patient would flash the previous one's data, since the
  // stale `patient` stays mounted until the new fetch resolves.
  const current = patient?.id === patientId ? patient : null;
  const history = current?.personalHistory;

  // Derive the last clinic from most recent appointment
  const lastClinicId =
    current?.appointments?.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )?.[0]?.clinicId || null;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <Card className="border-emerald-500 border-2 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              {t("withDoctorNow")}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Patient info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {appointment.queueNumber && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
                  {appointment.queueNumber}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold truncate">
                    {current?.personalHistory?.fullName ??
                      appointment.patientName}
                  </span>
                  {history?.sex && (
                    <Badge variant="outline" className="capitalize">
                      {history.sex}
                    </Badge>
                  )}
                  {history?.dateOfBirth && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {t("years", {
                        count: differenceInYears(
                          new Date(),
                          new Date(history.dateOfBirth),
                        ),
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>
                    {current?.personalHistory?.phoneNumber ??
                      appointment.patientPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* Complete button */}
            <Button
              onClick={onComplete}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto shrink-0"
            >
              <Check className="h-4 w-4 me-2" />
              {t("complete")}
            </Button>
          </div>

          {appointment.notes && (
            <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900">
              {appointment.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Full Patient Profile Tabs */}
      {isPending && !current && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
            <p>{t("loadingProfile")}</p>
          </CardContent>
        </Card>
      )}

      {/* Kept mounted while reloading so the open tab is not reset */}
      {current && (
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="personal">{tTabs("personal")}</TabsTrigger>
            <TabsTrigger value="history">{tTabs("history")}</TabsTrigger>
            <TabsTrigger value="examination">
              {tTabs("examination")}
            </TabsTrigger>
            <TabsTrigger value="sessions">{tTabs("sessions")}</TabsTrigger>
            <TabsTrigger value="medications">
              {tTabs("medications")}
            </TabsTrigger>
            <TabsTrigger value="labResults">{tTabs("labResults")}</TabsTrigger>
            <TabsTrigger value="investigations">
              {tTabs("investigations")}
            </TabsTrigger>
            <TabsTrigger value="appointments">
              {tTabs("appointments")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <PersonalInfoTab history={history ?? null} patientId={current.id} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab
              patientId={current.id}
              history={history ?? null}
              previousMedications={current.previousMedications}
            />
          </TabsContent>

          <TabsContent value="examination">
            <ExaminationTab patientId={current.id} history={history ?? null} />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionsTab
              patientId={current.id}
              patientName={history?.fullName ?? ""}
              sessions={current.sessions}
              labSheets={current.investigationSheets}
              lastClinicId={lastClinicId}
              clinics={clinics}
              appointmentId={appointment.id}
              currentPreAssessment={preAssessment}
            />
          </TabsContent>

          <TabsContent value="medications">
            <MedicationsTab sessions={current.sessions} />
          </TabsContent>

          <TabsContent value="labResults">
            <LabResultsTab
              patientId={current.id}
              sheets={current.investigationSheets}
              onChanged={loadPatient}
            />
          </TabsContent>

          <TabsContent value="investigations">
            <InvestigationsTab
              patientId={current.id}
              investigations={current.investigations}
            />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentsTab appointments={current.appointments} />
          </TabsContent>
        </Tabs>
      )}

      {!isPending && !current && appointment.patientId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{t("couldNotLoad")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
