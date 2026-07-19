"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppointmentType, Clinic } from "@prisma/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  RefreshCw,
  Building2,
  UserRound,
  Printer,
  FlaskConical,
} from "lucide-react";
import { QueueList, CurrentPatient, QueueStats } from "@/components/queue";
import { BookingDialog, ScheduledList } from "@/components/appointments";
import { useActionErrors } from "@/lib/use-action-errors";
import {
  bookAppointment,
  callNextPatient,
  callPatientToDoctor,
  updateAppointmentStatus,
  reorderQueue,
  getTodayQueue,
} from "@/actions/appointments";
import { getPrintableSession } from "@/actions/sessions";
import {
  printPrescription,
  hasActiveMeds,
} from "@/components/patients/sessions/print-rx";
import { printInvestigations } from "@/components/patients/sessions/print-investigations";

// The server action is the single source of truth for the queue's shape, so
// deriving the type from it keeps the client honest as the shape grows
// (preAssessment badge, withAssistant slot).
type QueueData = Awaited<ReturnType<typeof getTodayQueue>>;

interface QueuePageClientProps {
  clinics: Clinic[];
  initialClinicId: string;
  initialData: QueueData;
}

export function QueuePageClient({
  clinics,
  initialClinicId,
  initialData,
}: QueuePageClientProps) {
  const t = useTranslations("queue");
  const tToast = useTranslations("appointmentsToast");
  const tSession = useTranslations("session");
  const { failed, showError } = useActionErrors();
  const [selectedClinicId, setSelectedClinicId] = useState(initialClinicId);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const refreshQueue = (clinicId?: string) => {
    const targetClinicId = clinicId ?? selectedClinicId;
    startTransition(async () => {
      const newData = await getTodayQueue(targetClinicId);
      setData(newData);
    });
  };

  const handleClinicChange = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    refreshQueue(clinicId);
  };

  const handleBook = async (formData: {
    patientName: string;
    patientPhone: string;
    date: Date;
    type: AppointmentType;
    notes?: string;
    clinicId: string;
    patientId?: string;
    bookedById?: string;
  }) => {
    try {
      const res = await bookAppointment({
        patientName: formData.patientName,
        patientPhone: formData.patientPhone,
        patientId: formData.patientId,
        clinicId: formData.clinicId,
        // Send the picked calendar day (local), not a UTC instant, so the
        // stored date matches the day the user selected.
        date: format(formData.date, "yyyy-MM-dd"),
        type: formData.type,
        notes: formData.notes,
        bookedById: formData.bookedById,
      });
      if (failed(res)) throw new Error(res.ok ? "" : res.error);
      toast.success(tToast("booked"));
      refreshQueue(formData.clinicId);
    } catch (error) {
      // Let the dialog know the booking didn't go through (it keeps itself open
      // and re-enables submit). The toast was already shown by `failed`.
      throw error;
    }
  };

  const handleCallNext = async () => {
    startTransition(async () => {
      try {
        const result = await callNextPatient(selectedClinicId);
        if (result) {
          toast.success(tToast("calling", { name: result.patientName }));
        } else {
          toast.info(tToast("noWaiting"));
        }
        refreshQueue();
      } catch {
        showError();
      }
    });
  };

  const handleCallToDoctor = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        const res = await callPatientToDoctor(appointmentId);
        if (failed(res)) return;
        refreshQueue();
      } catch {
        showError();
      }
    });
  };

  const handleComplete = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, "COMPLETED");
        toast.success(tToast("sessionCompleted"));
        refreshQueue();
      } catch {
        showError();
      }
    });
  };

  const handleCancel = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, "CANCELLED");
        toast.success(tToast("cancelled"));
        refreshQueue();
      } catch {
        showError();
      }
    });
  };

  const handleNoShow = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, "NO_SHOW");
        toast.success(tToast("markedNoShow"));
        refreshQueue();
      } catch {
        showError();
      }
    });
  };

  // Reprints from the completed tab. The row only holds counts; the full
  // session is fetched on click, then handed to the same print routines the
  // session detail uses.
  const handlePrintRx = async (sessionId: string, patientName: string) => {
    try {
      const session = await getPrintableSession(sessionId);
      if (session && hasActiveMeds(session)) {
        printPrescription(session, patientName);
      }
    } catch {
      showError();
    }
  };

  const handlePrintInvestigations = async (
    sessionId: string,
    patientName: string,
  ) => {
    try {
      const session = await getPrintableSession(sessionId);
      if (session) printInvestigations(session, patientName);
    } catch {
      showError();
    }
  };

  const handleReorder = async (
    appointmentId: string,
    newQueueNumber: number,
  ) => {
    startTransition(async () => {
      try {
        const res = await reorderQueue(
          appointmentId,
          newQueueNumber,
          selectedClinicId,
        );
        if (failed(res)) return;
        refreshQueue();
      } catch {
        showError();
      }
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Clinic Selector */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex gap-2">
          {clinics.map((clinic) => (
            <Button
              key={clinic.id}
              size="sm"
              variant={clinic.id === selectedClinicId ? "default" : "outline"}
              onClick={() => handleClinicChange(clinic.id)}
              disabled={isPending}
              className="whitespace-nowrap"
            >
              {clinic.name.replace("Darelkola - ", "")}
            </Button>
          ))}
        </div>
      </div>

      {/* Header — stacked on mobile */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">{t("title")}</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshQueue()}
              disabled={isPending}
            >
              <RefreshCw
                className={`h-4 w-4 me-1.5 ${isPending ? "animate-spin" : ""}`}
              />
              {t("refresh")}
            </Button>
            <BookingDialog clinics={clinics} onBook={handleBook} />
          </div>
        </div>

        {/* Stats — own row with breathing room */}
        <QueueStats stats={data.stats} />
      </div>

      {/* A patient is in the assistant's room — shown so the doctor can see
          where they went; they return to the waiting list when the assistant
          is done. */}
      {data.withAssistant && (
        <Card className="border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardContent className="p-3 flex items-center gap-3">
            {data.withAssistant.queueNumber && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm">
                {data.withAssistant.queueNumber}
              </span>
            )}
            <span className="text-sm font-medium truncate">
              {data.withAssistant.patientName}
            </span>
            {data.withAssistant.isNewPatient && (
              <Badge
                variant="outline"
                className="shrink-0 text-xs border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-400"
              >
                {t("newPatient")}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="ms-auto text-xs border-indigo-300 text-indigo-700"
            >
              {t("withAssistant")}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Current Patient */}
      <CurrentPatient
        appointment={data.withDoctor ?? null}
        onComplete={() => data.withDoctor && handleComplete(data.withDoctor.id)}
        clinics={clinics}
      />

      {/* Call Next Button */}
      {!data.withDoctor && data.waiting.length > 0 && (
        <Button
          size="lg"
          className="w-full"
          onClick={handleCallNext}
          disabled={isPending}
        >
          <ArrowRight className="h-4 w-4 me-2" />
          {t("callNext")}
        </Button>
      )}

      {/* Tabs for Waiting / Scheduled / Completed */}
      <Tabs defaultValue="waiting">
        <TabsList>
          <TabsTrigger value="waiting">
            {t("waitingCount", { count: data.waiting.length })}
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            {t("scheduledCount", { count: data.scheduled.length })}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t("completedCount", { count: data.completed.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="mt-4">
          {data.waiting.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("noWaiting")}
              </CardContent>
            </Card>
          ) : (
            <QueueList
              appointments={data.waiting}
              onReorder={handleReorder}
              onComplete={handleComplete}
              onCancel={handleCancel}
              onNoShow={handleNoShow}
              onCallToDoctor={data.withDoctor ? undefined : handleCallToDoctor}
            />
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <ScheduledList
            appointments={data.scheduled}
            onRefresh={() => refreshQueue()}
            onCancel={handleCancel}
            onNoShow={handleNoShow}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {data.completed.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("noCompleted")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {data.completed.map((apt) => {
                const printable = apt.printable;
                return (
                  <Card key={apt.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {apt.queueNumber && (
                          <span className="text-muted-foreground">
                            #{apt.queueNumber}
                          </span>
                        )}
                        <span className="font-medium">{apt.patientName}</span>
                        <span className="text-muted-foreground">
                          {apt.patientPhone}
                        </span>
                        <div className="ms-auto flex flex-wrap gap-2">
                          {printable &&
                            printable._count.sessionMedications > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handlePrintRx(printable.id, apt.patientName)
                                }
                              >
                                <Printer className="h-4 w-4 me-1.5" />
                                {tSession("printRx")}
                              </Button>
                            )}
                          {printable &&
                            printable._count.sessionInvestigations > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handlePrintInvestigations(
                                    printable.id,
                                    apt.patientName,
                                  )
                                }
                              >
                                <FlaskConical className="h-4 w-4 me-1.5" />
                                {tSession("printRequests")}
                              </Button>
                            )}
                          {apt.patientId && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/patients/${apt.patientId}`}>
                                <UserRound className="h-4 w-4 me-1.5" />
                                {t("viewProfile")}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
