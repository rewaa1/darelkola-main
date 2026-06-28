"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Appointment, Clinic } from "@prisma/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, RefreshCw, Building2 } from "lucide-react";
import { QueueList, CurrentPatient, QueueStats } from "@/components/queue";
import { BookingDialog, ScheduledList } from "@/components/appointments";
import {
  bookAppointment,
  callNextPatient,
  updateAppointmentStatus,
  reorderQueue,
  getTodayQueue,
} from "@/actions/appointments";

interface QueueData {
  appointments: Appointment[];
  scheduled: Appointment[];
  waiting: Appointment[];
  withDoctor: Appointment | undefined;
  completed: Appointment[];
  stats: {
    total: number;
    scheduled: number;
    waiting: number;
    completed: number;
  };
}

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
    notes?: string;
    clinicId: string;
    patientId?: string;
  }) => {
    try {
      await bookAppointment({
        patientName: formData.patientName,
        patientPhone: formData.patientPhone,
        patientId: formData.patientId,
        clinicId: formData.clinicId,
        date: formData.date.toISOString(),
        notes: formData.notes,
      });
      toast.success(tToast("booked"));
      refreshQueue(formData.clinicId);
    } catch (error) {
      toast.error((error as Error).message);
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
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  const handleComplete = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, "COMPLETED");
        toast.success(tToast("sessionCompleted"));
        refreshQueue();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  const handleCancel = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, "CANCELLED");
        toast.success(tToast("cancelled"));
        refreshQueue();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  const handleNoShow = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, "NO_SHOW");
        toast.success(tToast("markedNoShow"));
        refreshQueue();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  const handleReorder = async (
    appointmentId: string,
    newQueueNumber: number,
  ) => {
    startTransition(async () => {
      try {
        await reorderQueue(appointmentId, newQueueNumber, selectedClinicId);
        refreshQueue();
      } catch (error) {
        toast.error((error as Error).message);
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
              {data.completed.map((apt) => (
                <Card key={apt.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {apt.queueNumber && (
                        <span className="text-muted-foreground">
                          #{apt.queueNumber}
                        </span>
                      )}
                      <span>{apt.patientName}</span>
                      <span className="text-muted-foreground">
                        {apt.patientPhone}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
