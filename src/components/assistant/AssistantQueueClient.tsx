"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Clinic } from "@prisma/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Building2,
  Phone,
  ArrowRight,
  Check,
  Users,
} from "lucide-react";
import {
  getTodayQueue,
  callPatientToAssistant,
} from "@/actions/appointments";
import { AssistantCurrentPatient } from "./AssistantCurrentPatient";

type QueueData = Awaited<ReturnType<typeof getTodayQueue>>;
type WaitingAppointment = QueueData["waiting"][number];

interface Props {
  clinics: Clinic[];
  initialClinicId: string;
  initialData: QueueData;
}

export function AssistantQueueClient({
  clinics,
  initialClinicId,
  initialData,
}: Props) {
  const t = useTranslations("assistant");
  const [selectedClinicId, setSelectedClinicId] = useState(initialClinicId);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const refresh = (clinicId?: string) => {
    const target = clinicId ?? selectedClinicId;
    startTransition(async () => {
      setData(await getTodayQueue(target));
    });
  };

  const handleClinicChange = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    refresh(clinicId);
  };

  const handleCallIn = (appointmentId: string) => {
    startTransition(async () => {
      try {
        await callPatientToAssistant(appointmentId);
        refresh();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  const busy = Boolean(data.withAssistant);

  return (
    <div className="space-y-4">
      {/* Clinic selector */}
      {clinics.length > 1 && (
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
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{t("title")}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          disabled={isPending}
        >
          <RefreshCw
            className={`h-4 w-4 me-1.5 ${isPending ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      {/* Patient currently with the assistant — full width, it holds the record */}
      {data.withAssistant && (
        <AssistantCurrentPatient
          appointment={data.withAssistant}
          clinics={clinics}
          onDone={() => refresh()}
        />
      )}

      {/* Waiting room — a queue reads best as a single narrow column, not
          stretched across the record's width. */}
      <div className="max-w-2xl space-y-2">
        {!data.withAssistant && (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-foreground">
              {t("noPatientWithAssistant")}
            </p>
            <p className="text-sm mt-0.5">{t("callFromWaiting")}</p>
          </div>
        )}

        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">
          {t("waiting", { count: data.waiting.length })}
        </h2>
        {data.waiting.length === 0 ? (
          <p className="rounded-lg border py-6 text-center text-muted-foreground text-sm">
            {t("noWaiting")}
          </p>
        ) : (
          data.waiting.map((apt) => (
            <WaitingCard
              key={apt.id}
              appointment={apt}
              disabled={isPending || busy}
              onCallIn={() => handleCallIn(apt.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WaitingCard({
  appointment,
  disabled,
  onCallIn,
}: {
  appointment: WaitingAppointment;
  disabled: boolean;
  onCallIn: () => void;
}) {
  const t = useTranslations("assistant");
  const assessed = Boolean(appointment.preAssessment);

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        {appointment.queueNumber && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
            {appointment.queueNumber}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {appointment.patientName}
            </span>
            {assessed ? (
              <Badge
                variant="outline"
                className="text-[10px] border-indigo-300 text-indigo-600 shrink-0"
              >
                <Check className="h-3 w-3 me-0.5" />
                {t("preAssessed")}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] text-muted-foreground shrink-0"
              >
                {t("notAssessedYet")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{appointment.patientPhone}</span>
          </div>
        </div>
        {/* Once assessed, the assistant is finished with this patient — no way
            to call them back in. They wait here for the doctor. */}
        {assessed ? (
          <span className="text-xs text-muted-foreground shrink-0">
            {t("done")}
          </span>
        ) : (
          <Button size="sm" onClick={onCallIn} disabled={disabled}>
            <ArrowRight className="h-4 w-4 me-1.5 rtl:rotate-180" />
            {t("callIn")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
