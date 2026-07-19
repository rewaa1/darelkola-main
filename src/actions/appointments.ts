"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AppointmentStatus, AppointmentType } from "@prisma/client";
import { paginationToSkipTake, buildPaginatedResult } from "@/lib/pagination";
import { clinicDay, clinicDayString, toDateOnly } from "@/lib/clinic-day";
import { requireRole } from "@/lib/auth";
import {
  type ActionResult,
  actionError,
  runAction,
} from "@/lib/action-result";

// ===========================================
// Date helpers
// ===========================================
//
// Appointment `date` is a calendar day (@db.Date), always at UTC midnight, so
// the stored day equals the day the user picked.
//
// "Today" is never the calendar day — the clinic works past midnight, so the
// working day comes from `clinicDay()`. See src/lib/clinic-day.ts.

// ===========================================
// Types
// ===========================================

export type BookAppointmentInput = {
  patientName: string;
  patientPhone: string;
  patientId?: string;
  clinicId: string;
  date: string; // ISO date string
  type?: AppointmentType;
  notes?: string;
  bookedById?: string; // receptionist who created the booking
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
      bookedBy: { select: { name: true } },
      checkedInBy: { select: { name: true } },
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
        bookedBy: { select: { name: true } },
        checkedInBy: { select: { name: true } },
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

export async function bookAppointment(
  data: BookAppointmentInput,
): Promise<ActionResult<{ appointmentId: string }>> {
  return runAction(async () => {
    // data.date is the calendar day the user selected ("YYYY-MM-DD"). Store it
    // at UTC midnight so it lands on exactly that day.
    const appointmentDay = data.date.slice(0, 10);
    const appointmentDate = toDateOnly(appointmentDay);

    // Validation: cannot book before the working day currently in progress. At
    // 2 AM that is still yesterday's date, which is what reception needs in
    // order to book a walk-in onto the shift that is running.
    if (appointmentDay < clinicDayString()) actionError("appointmentInPast");

    try {
      const appointment = await prisma.appointment.create({
        data: {
          patientName: data.patientName,
          patientPhone: data.patientPhone,
          patientId: data.patientId,
          clinicId: data.clinicId,
          date: appointmentDate,
          type: data.type ?? "REGULAR_EXAMINATION",
          notes: data.notes,
          status: "SCHEDULED",
          bookedById: data.bookedById,
        },
      });

      revalidatePath("/queue");
      revalidatePath("/appointments");
      return { appointmentId: appointment.id };
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        actionError("appointmentDuplicate");
      }
      throw error;
    }
  });
}

// ===========================================
// Update Appointment (reschedule / edit details)
// ===========================================

export type UpdateAppointmentInput = {
  date?: string; // "YYYY-MM-DD"
  type?: AppointmentType;
  notes?: string;
  clinicId?: string;
};

// Editing is for a booking that has not yet begun. Once the patient is checked
// in (queue number assigned) or seen, moving the date would strand the queue,
// so only SCHEDULED appointments can be edited.
export async function updateAppointment(
  appointmentId: string,
  data: UpdateAppointmentInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) actionError("appointmentNotFound");
    if (appointment.status !== "SCHEDULED") {
      actionError("onlyScheduledEditable");
    }

    const updateData: {
      date?: Date;
      type?: AppointmentType;
      notes?: string | null;
      clinicId?: string;
    } = {};

    if (data.type) updateData.type = data.type;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.clinicId) updateData.clinicId = data.clinicId;

    if (data.date) {
      const day = data.date.slice(0, 10);
      // Cannot move an appointment before the working day in progress.
      if (day < clinicDayString()) actionError("cannotMoveToPast");
      updateData.date = toDateOnly(day);
    }

    try {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
      });
      revalidatePath("/appointments");
      revalidatePath("/queue");
    } catch (error) {
      // Same (phone, date, clinic) uniqueness that guards booking.
      if ((error as { code?: string }).code === "P2002") {
        actionError("appointmentDuplicate");
      }
      throw error;
    }
  });
}

// ===========================================
// Get Today's Queue
// ===========================================

export async function getTodayQueue(clinicId: string) {
  const today = clinicDay();

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      date: today,
    },
    include: {
      bookedBy: { select: { name: true } },
      checkedInBy: { select: { name: true } },
      // Presence of a row is the "pre-assessed" badge; whether it's still
      // claimable (sessionId null) tells the assistant's side it's editable.
      preAssessment: { select: { id: true, sessionId: true } },
    },
    orderBy: [
      { queueNumber: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });

  // First visit ever — the patient has no sessions on file (a booking with no
  // patient record at all is new by definition). Reception and the assistant
  // read this flag; the doctor's view derives it from the loaded patient.
  const queuePatientIds = [
    ...new Set(
      appointments
        .map((a) => a.patientId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const seenBefore = queuePatientIds.length
    ? await prisma.session.groupBy({
        by: ["patientId"],
        where: { patientId: { in: queuePatientIds } },
      })
    : [];
  const seenSet = new Set(seenBefore.map((s) => s.patientId));
  const flagged = appointments.map((a) => ({
    ...a,
    isNewPatient: a.patientId === null || !seenSet.has(a.patientId),
  }));

  // Group by status. WITH_ASSISTANT and WITH_DOCTOR are two independent
  // single-occupancy rooms, so each surfaces at most one patient.
  const scheduled = flagged.filter((a) => a.status === "SCHEDULED");
  const waiting = flagged.filter((a) => a.status === "CHECKED_IN");
  const withAssistant = flagged.find((a) => a.status === "WITH_ASSISTANT");
  const withDoctor = flagged.find((a) => a.status === "WITH_DOCTOR");
  const completedRaw = flagged.filter((a) => a.status === "COMPLETED");

  // What each completed visit's session left behind — just counts, so the
  // completed tab can offer reprints without shipping full session payloads on
  // every refresh. Sessions carry no appointment FK; today's session for the
  // patient is the visit's session (newest first if the doctor somehow made
  // two).
  const completedPatientIds = [
    ...new Set(
      completedRaw
        .map((a) => a.patientId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const todaySessions = completedPatientIds.length
    ? await prisma.session.findMany({
        where: { patientId: { in: completedPatientIds }, date: today },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          patientId: true,
          _count: {
            select: {
              sessionMedications: { where: { active: true } },
              sessionInvestigations: true,
            },
          },
        },
      })
    : [];
  const sessionByPatient = new Map<string, (typeof todaySessions)[number]>();
  for (const s of todaySessions) {
    if (!sessionByPatient.has(s.patientId)) sessionByPatient.set(s.patientId, s);
  }
  const completed = completedRaw.map((apt) => ({
    ...apt,
    printable: apt.patientId
      ? (sessionByPatient.get(apt.patientId) ?? null)
      : null,
  }));

  return {
    appointments: flagged,
    scheduled,
    waiting,
    withAssistant,
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

export async function checkInPatient(
  appointmentId: string,
  receptionistId?: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) actionError("appointmentNotFound");
    if (appointment.status !== "SCHEDULED") actionError("notScheduled");

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

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CHECKED_IN",
        queueNumber: nextQueueNumber,
        checkedInAt: new Date(),
        checkedInById: receptionistId,
      },
    });

    revalidatePath("/queue");
  });
}

// ===========================================
// Check-In With Patient (for new registrations)
// ===========================================

export async function checkInWithPatient(
  appointmentId: string,
  patientId: string,
  receptionistId?: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) actionError("appointmentNotFound");
    if (appointment.status !== "SCHEDULED") actionError("notScheduled");

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
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CHECKED_IN",
        queueNumber: nextQueueNumber,
        patientId: patientId,
        checkedInAt: new Date(),
        checkedInById: receptionistId,
      },
    });

    revalidatePath("/queue");
    revalidatePath("/patients");
  });
}

// ===========================================
// Call Next Patient
// ===========================================

export async function callNextPatient(clinicId: string) {
  const today = clinicDay();

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
// Manual pick (doctor picks a specific waiting patient)
// ===========================================
//
// The doctor chooses whom to see rather than taking strict queue order, so he
// can favour a patient the assistant has already pre-assessed. Not role-guarded
// — reception operates the doctor's queue on a shared screen, as today.

export async function callPatientToDoctor(
  appointmentId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) actionError("appointmentNotFound");
    if (appointment.status !== "CHECKED_IN") actionError("notInWaitingRoom");

    // One doctor's room.
    const busy = await prisma.appointment.findFirst({
      where: {
        clinicId: appointment.clinicId,
        date: appointment.date,
        status: "WITH_DOCTOR",
      },
    });
    if (busy) actionError("doctorRoomBusy");

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "WITH_DOCTOR" },
    });

    revalidatePath("/queue");
  });
}

// ===========================================
// Assistant room (pre-assessment)
// ===========================================
//
// The assistant is a real login; these are his to call, so they are guarded to
// his role. A patient in his room drops out of the doctor's waiting pool
// automatically, because both doctor picks filter on CHECKED_IN.

export async function callPatientToAssistant(
  appointmentId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireRole("ASSISTANT");

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) actionError("appointmentNotFound");
    if (appointment.status !== "CHECKED_IN") actionError("notInWaitingRoom");

    // Once assessed, the assistant is done with this patient — he cannot call
    // them back in. The assessment is finished when he sends them back; from
    // then on any correction is the doctor's to make.
    const alreadyAssessed = await prisma.preAssessment.findUnique({
      where: { appointmentId },
      select: { id: true },
    });
    if (alreadyAssessed) actionError("alreadyAssessed");

    // One assistant's room, mirroring the doctor.
    const busy = await prisma.appointment.findFirst({
      where: {
        clinicId: appointment.clinicId,
        date: appointment.date,
        status: "WITH_ASSISTANT",
      },
    });
    if (busy) actionError("assistantRoomBusy");

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "WITH_ASSISTANT" },
    });

    revalidatePath("/assistant");
    revalidatePath("/queue");
  });
}

/** Send the patient back to the waiting room. The queue number is untouched, so
 *  they keep their place; whether they were assessed is told by PreAssessment. */
export async function finishWithAssistant(
  appointmentId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireRole("ASSISTANT");

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) actionError("appointmentNotFound");
    if (appointment.status !== "WITH_ASSISTANT") actionError("notWithAssistant");

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CHECKED_IN" },
    });

    revalidatePath("/assistant");
    revalidatePath("/queue");
  });
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
): Promise<ActionResult> {
  return runAction(async () => {
    const today = clinicDay();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment?.queueNumber) actionError("notInQueue");

    const oldNumber = appointment.queueNumber;
    if (oldNumber === newQueueNumber) return;

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
  });
}

// Note: No-shows are marked manually by staff using updateAppointmentStatus
// since appointments can go past midnight
