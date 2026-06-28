import { AppointmentStatus } from "@prisma/client";

export type AppointmentRow = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientId: string | null;
  clinicId: string;
  date: Date;
  status: AppointmentStatus;
  queueNumber: number | null;
  notes: string | null;
  clinic: { name: string };
  patient: { id: string } | null;
};

export const statusColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
  CHECKED_IN: "bg-amber-100 text-amber-700 border-amber-200",
  WITH_DOCTOR: "bg-purple-100 text-purple-700 border-purple-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
  NO_SHOW: "bg-red-100 text-red-700 border-red-200",
};

// Canonical status order. Display labels come from the "status" i18n namespace.
export const appointmentStatuses: AppointmentStatus[] = [
  "SCHEDULED",
  "CHECKED_IN",
  "WITH_DOCTOR",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];
