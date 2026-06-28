"use client";

import { useTranslations } from "next-intl";
import { Appointment } from "@prisma/client";
import { QueueCard } from "../queue/QueueCard";

interface ScheduledListProps {
  appointments: Appointment[];
  onRefresh: () => void;
  onCancel: (appointmentId: string) => void;
  onNoShow: (appointmentId: string) => void;
}

export function ScheduledList({
  appointments,
  onRefresh,
  onCancel,
  onNoShow,
}: ScheduledListProps) {
  const t = useTranslations("scheduled");

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noScheduled")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {appointments.map((appointment) => (
        <QueueCard
          key={appointment.id}
          appointment={appointment}
          onCheckIn={onRefresh}
          onCancel={() => onCancel(appointment.id)}
          onNoShow={() => onNoShow(appointment.id)}
        />
      ))}
    </div>
  );
}
