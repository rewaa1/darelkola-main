"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AppointmentStatus } from "@prisma/client";
import { paginationToSkipTake, buildPaginatedResult } from "@/lib/pagination";

// ===========================================
// Types
// ===========================================

export type BookAppointmentInput = {
  patientName: string;
  patientPhone: string;
  patientId?: string;
  clinicId: string;
  date: string; // ISO date string
  notes?: string;
};

// ===========================================
// Get All Clinics
// ===========================================

export async function getClinics() {
  return await prisma.clinic.findMany({
    orderBy: { name: "asc" },
  });
}

// ===========================================
// Get Appointments (with filters)
// ===========================================

export async function getAppointments(filters?: {
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  search?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.clinicId) where.clinicId = filters.clinicId;
  if (filters?.status) where.status = filters.status;
  if (filters?.startDate || filters?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.date = dateFilter;
  }

  if (filters?.search) {
    where.OR = [
      { patientName: { contains: filters.search, mode: "insensitive" } },
      { patientPhone: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.appointment.findMany({
    where,
    include: {
      clinic: { select: { name: true } },
      patient: { select: { id: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });
}

// ===========================================
// Get Paginated Appointments
// ===========================================

export async function getPaginatedAppointments(params: {
  page: number;
  pageSize: number;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}) {
  const { skip, take } = paginationToSkipTake(params);

  const where: Record<string, unknown> = {};

  if (params.clinicId) where.clinicId = params.clinicId;
  if (params.status) where.status = params.status;
  if (params.startDate || params.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.date = dateFilter;
  }
  if (params.search) {
    where.OR = [
      { patientName: { contains: params.search, mode: "insensitive" } },
      { patientPhone: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [data, totalCount] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        clinic: { select: { name: true } },
        patient: { select: { id: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take,
    }),
    prisma.appointment.count({ where }),
  ]);

  return buildPaginatedResult(data, totalCount, params);
}

// ===========================================
// Delete Appointment
// ===========================================

export async function deleteAppointment(appointmentId: string) {
  await prisma.appointment.delete({
    where: { id: appointmentId },
  });
  revalidatePath("/appointments");
  revalidatePath("/queue");
}

// ===========================================
// Book Appointment
// ===========================================

export async function bookAppointment(data: BookAppointmentInput) {
  const appointmentDate = new Date(data.date);
  appointmentDate.setHours(0, 0, 0, 0);

  // Validation: Cannot book in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (appointmentDate < today) {
    throw new Error("Cannot book appointments in the past");
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientId: data.patientId,
        clinicId: data.clinicId,
        date: appointmentDate,
        notes: data.notes,
        status: "SCHEDULED",
      },
    });

    revalidatePath("/queue");
    return { success: true, appointment };
  } catch (error) {
    // Handle unique constraint violation
    if ((error as { code?: string }).code === "P2002") {
      throw new Error(
        "Patient already has an appointment on this date at this clinic",
      );
    }
    throw error;
  }
}

// ===========================================
// Get Today's Queue
// ===========================================

export async function getTodayQueue(clinicId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      date: today,
    },
    orderBy: [
      { queueNumber: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });

  // Group by status
  const scheduled = appointments.filter((a) => a.status === "SCHEDULED");
  const waiting = appointments.filter((a) => a.status === "CHECKED_IN");
  const withDoctor = appointments.find((a) => a.status === "WITH_DOCTOR");
  const completed = appointments.filter((a) => a.status === "COMPLETED");

  return {
    appointments,
    scheduled,
    waiting,
    withDoctor,
    completed,
    stats: {
      total: appointments.length,
      scheduled: scheduled.length,
      waiting: waiting.length,
      completed: completed.length,
    },
  };
}

// ===========================================
// Check-In Patient
// ===========================================

export async function checkInPatient(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "SCHEDULED") {
    throw new Error("Appointment is not in SCHEDULED status");
  }

  // Get next queue number for today at this clinic
  const lastInQueue = await prisma.appointment.findFirst({
    where: {
      clinicId: appointment.clinicId,
      date: appointment.date,
      queueNumber: { not: null },
    },
    orderBy: { queueNumber: "desc" },
  });

  const nextQueueNumber = (lastInQueue?.queueNumber ?? 0) + 1;

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CHECKED_IN",
      queueNumber: nextQueueNumber,
    },
  });

  revalidatePath("/queue");
  return updated;
}

// ===========================================
// Check-In With Patient (for new registrations)
// ===========================================

export async function checkInWithPatient(
  appointmentId: string,
  patientId: string,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "SCHEDULED") {
    throw new Error("Appointment is not in SCHEDULED status");
  }

  // Get next queue number for today at this clinic
  const lastInQueue = await prisma.appointment.findFirst({
    where: {
      clinicId: appointment.clinicId,
      date: appointment.date,
      queueNumber: { not: null },
    },
    orderBy: { queueNumber: "desc" },
  });

  const nextQueueNumber = (lastInQueue?.queueNumber ?? 0) + 1;

  // Link patient and check in atomically
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CHECKED_IN",
      queueNumber: nextQueueNumber,
      patientId: patientId,
    },
  });

  revalidatePath("/queue");
  revalidatePath("/patients");
  return updated;
}

// ===========================================
// Call Next Patient
// ===========================================

export async function callNextPatient(clinicId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find next waiting patient (lowest queue number with CHECKED_IN status)
  const nextPatient = await prisma.appointment.findFirst({
    where: {
      clinicId,
      date: today,
      status: "CHECKED_IN",
      queueNumber: { not: null },
    },
    orderBy: { queueNumber: "asc" },
  });

  if (!nextPatient) {
    return null;
  }

  const updated = await prisma.appointment.update({
    where: { id: nextPatient.id },
    data: { status: "WITH_DOCTOR" },
  });

  revalidatePath("/queue");
  return updated;
}

// ===========================================
// Update Appointment Status
// ===========================================

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
) {
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });

  revalidatePath("/queue");
  return updated;
}

// ===========================================
// Complete Session
// ===========================================

export async function completeSession(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, "COMPLETED");
}

// ===========================================
// Reorder Queue (Drag & Drop)
// ===========================================

export async function reorderQueue(
  appointmentId: string,
  newQueueNumber: number,
  clinicId: string,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment?.queueNumber) {
    throw new Error("Appointment not in queue");
  }

  const oldNumber = appointment.queueNumber;

  if (oldNumber === newQueueNumber) {
    return appointment;
  }

  // Use transaction to ensure consistency
  await prisma.$transaction(async (tx) => {
    if (newQueueNumber < oldNumber) {
      // Moving up: increment those between new and old
      await tx.appointment.updateMany({
        where: {
          clinicId,
          date: today,
          queueNumber: { gte: newQueueNumber, lt: oldNumber },
          status: "CHECKED_IN",
        },
        data: { queueNumber: { increment: 1 } },
      });
    } else {
      // Moving down: decrement those between old and new
      await tx.appointment.updateMany({
        where: {
          clinicId,
          date: today,
          queueNumber: { gt: oldNumber, lte: newQueueNumber },
          status: "CHECKED_IN",
        },
        data: { queueNumber: { decrement: 1 } },
      });
    }

    // Set the target appointment's new queue number
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { queueNumber: newQueueNumber },
    });
  });

  revalidatePath("/queue");
  return await prisma.appointment.findUnique({ where: { id: appointmentId } });
}

// Note: No-shows are marked manually by staff using updateAppointmentStatus
// since appointments can go past midnight
