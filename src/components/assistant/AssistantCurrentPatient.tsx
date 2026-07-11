"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { differenceInYears } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Calendar, LogOut, Stethoscope } from "lucide-react";
import { Clinic } from "@prisma/client";
import { getPatient } from "@/actions/patients";
import {
  getPreAssessmentForAppointment,
} from "@/actions/pre-assessments";
import { finishWithAssistant } from "@/actions/appointments";
import { PersonalInfoTab } from "@/components/patients/PersonalInfoTab";
import { HistoryTab } from "@/components/patients/HistoryTab";
import { ExaminationTab } from "@/components/patients/ExaminationTab";
import { SessionsTab } from "@/components/patients/SessionsTab";
import { MedicationsTab } from "@/components/patients/MedicationsTab";
import { LabResultsTab } from "@/components/patients/LabResultsTab";
import { InvestigationsTab } from "@/components/patients/InvestigationsTab";
import { AppointmentsTab } from "@/components/patients/AppointmentsTab";
import { PreAssessmentForm } from "./PreAssessmentForm";

type PatientData = Awaited<ReturnType<typeof getPatient>>;
type PreAssessmentData = Awaited<
  ReturnType<typeof getPreAssessmentForAppointment>
>;

interface Props {
  appointment: {
    id: string;
    patientId: string | null;
    patientName: string;
    patientPhone: string;
    queueNumber: number | null;
  };
  clinics: Clinic[];
  onDone: () => void;
}

export function AssistantCurrentPatient({
  appointment,
  clinics,
  onDone,
}: Props) {
  const t = useTranslations("assistant");
  const tTabs = useTranslations("tabs");
  const [patient, setPatient] = useState<PatientData>(null);
  const [preAssessment, setPreAssessment] = useState<PreAssessmentData>(null);
  const [isPending, startTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);

  const patientId = appointment.patientId;

  const load = useCallback(() => {
    if (!patientId) {
      startTransition(() => setPatient(null));
      return;
    }
    startTransition(async () => {
      try {
        const [p, pre] = await Promise.all([
          getPatient(patientId),
          getPreAssessmentForAppointment(appointment.id),
        ]);
        setPatient(p);
        setPreAssessment(pre);
      } catch {
        setPatient(null);
      }
    });
  }, [patientId, appointment.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSendBack = () => {
    setIsSending(true);
    (async () => {
      try {
        await finishWithAssistant(appointment.id);
        toast.success(t("sentBack"));
        onDone();
      } catch (error) {
        toast.error((error as Error).message);
        setIsSending(false);
      }
    })();
  };

  const current = patient?.id === patientId ? patient : null;
  const history = current?.personalHistory;

  // Default clinic for the (read-only) sessions tab, derived from the patient's
  // most recent appointment — same as the doctor's current-patient view.
  const lastClinicId =
    current?.appointments
      ?.slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      ?.[0]?.clinicId || null;

  const age =
    history?.dateOfBirth != null
      ? differenceInYears(new Date(), new Date(history.dateOfBirth))
      : null;

  return (
    <div className="space-y-4">
      {/* Identity banner — thin, state-carrying. The indigo is confined here as
          a status marker; the record below reads on the page, not inside a
          tinted box. Mirrors the doctor's current-patient banner. */}
      <div className="rounded-lg border border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/25 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {appointment.queueNumber && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">
              {appointment.queueNumber}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
              <Stethoscope className="h-3.5 w-3.5" />
              {t("withAssistantNow")}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-semibold text-base truncate">
                {history?.fullName ?? appointment.patientName}
              </span>
              {history?.sex && (
                <Badge variant="outline" className="capitalize shrink-0">
                  {history.sex}
                </Badge>
              )}
              {age != null && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                  <Calendar className="h-3 w-3" />
                  {t("years", { count: age })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {history?.phoneNumber ?? appointment.patientPhone}
              </span>
            </div>
          </div>

          <Button
            onClick={handleSendBack}
            disabled={isSending}
            variant="outline"
            className="shrink-0"
          >
            <LogOut className="h-4 w-4 me-2 rtl:rotate-180" />
            {isSending ? t("sending") : t("sendBack")}
          </Button>
        </div>
      </div>

      {isPending && !current && (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* One tab strip: the assistant's own Assessment first and selected by
          default (his task), the patient's record after it (his reference).
          Tab panels render their own cards directly on the page — no nesting. */}
      {current && patientId && (
        <Tabs defaultValue="assessment" className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-auto min-w-full lg:grid lg:grid-cols-9">
              <TabsTrigger value="assessment" className="gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" />
                {t("assessment")}
              </TabsTrigger>
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
          </div>

          <TabsContent value="assessment">
            <PreAssessmentForm
              appointmentId={appointment.id}
              initial={preAssessment}
              onSaved={load}
            />
          </TabsContent>

          <TabsContent value="personal">
            <PersonalInfoTab history={history ?? null} patientId={patientId} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab
              patientId={patientId}
              history={history ?? null}
              previousMedications={current.previousMedications}
            />
          </TabsContent>

          <TabsContent value="examination">
            <ExaminationTab patientId={patientId} history={history ?? null} />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionsTab
              patientId={patientId}
              patientName={history?.fullName ?? ""}
              sessions={current.sessions}
              labSheets={current.investigationSheets}
              lastClinicId={lastClinicId}
              clinics={clinics}
              readOnly
            />
          </TabsContent>

          <TabsContent value="medications">
            <MedicationsTab sessions={current.sessions} />
          </TabsContent>

          <TabsContent value="labResults">
            <LabResultsTab
              patientId={patientId}
              sheets={current.investigationSheets}
              onChanged={load}
            />
          </TabsContent>

          <TabsContent value="investigations">
            <InvestigationsTab
              patientId={patientId}
              investigations={current.investigations}
            />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentsTab appointments={current.appointments} />
          </TabsContent>
        </Tabs>
      )}

      {!isPending && !current && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("couldNotLoad")}
        </p>
      )}
    </div>
  );
}
