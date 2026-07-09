"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ==============================
// Sessions
// ==============================

export async function getPatientSessions(patientId: string) {
  return prisma.session.findMany({
    where: { patientId },
    include: {
      sessionMedications: {
        include: { medication: true },
      },
      investigationSheets: {
        include: { extraInvestigations: true },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function getSession(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      sessionMedications: {
        include: { medication: true },
      },
      investigationSheets: {
        include: { extraInvestigations: true },
        orderBy: { date: "desc" },
      },
    },
  });
}

interface CreateSessionInput {
  date: string;
  clinicId: string;
  examination?: string;
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  respRate?: string;
  medications?: {
    medicationId: string;
    active?: boolean;
    dosage?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
  }[];
}

export async function createSession(
  patientId: string,
  data: CreateSessionInput,
) {
  const sessionDate = new Date(data.date);

  // Use a transaction to create session + appointment atomically
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        patientId,
        date: sessionDate,
        examination: data.examination,
        bloodPressure: data.bloodPressure,
        pulse: data.pulse,
        temperature: data.temperature,
        respRate: data.respRate,
        sessionMedications: data.medications?.length
          ? {
              create: data.medications.map((med) => ({
                medicationId: med.medicationId,
                active: med.active ?? true,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
                notes: med.notes,
              })),
            }
          : undefined,
      },
      include: {
        sessionMedications: { include: { medication: true } },
      },
    });

    // Claim the lab sheets reception entered ahead of this visit. They were
    // created against the patient with no session; this stamps them with the
    // session they arrived on so later sessions can tell them apart.
    await tx.investigationSheet.updateMany({
      where: { patientId, sessionId: null },
      data: { sessionId: created.id },
    });

    // Auto-create a COMPLETED appointment for this session
    const patient = await tx.personalHistory.findUnique({
      where: { patientId },
      select: { fullName: true, phoneNumber: true },
    });

    if (patient) {
      // Use upsert to handle case where appointment already exists for this date
      await tx.appointment.upsert({
        where: {
          patientPhone_date_clinicId: {
            patientPhone: patient.phoneNumber || "",
            date: sessionDate,
            clinicId: data.clinicId,
          },
        },
        update: { status: "COMPLETED" },
        create: {
          patientName: patient.fullName || "Unknown",
          patientPhone: patient.phoneNumber || "",
          patientId,
          clinicId: data.clinicId,
          date: sessionDate,
          status: "COMPLETED",
        },
      });
    }

    return created;
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/queue");
  return session;
}

export async function updateSession(
  sessionId: string,
  data: {
    examination?: string;
    bloodPressure?: string;
    pulse?: string;
    temperature?: string;
    respRate?: string;
  },
) {
  const session = await prisma.session.update({
    where: { id: sessionId },
    data,
  });
  revalidatePath(`/patients/${session.patientId}`);
  return session;
}

export async function deleteSession(sessionId: string) {
  const session = await prisma.session.delete({
    where: { id: sessionId },
  });
  revalidatePath(`/patients/${session.patientId}`);
}

// ==============================
// Session Medications
// ==============================

export async function addSessionMedication(
  sessionId: string,
  data: {
    medicationId: string;
    active?: boolean;
    dosage?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
  },
) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { patientId: true },
  });
  await prisma.sessionMedication.create({
    data: {
      sessionId,
      medicationId: data.medicationId,
      active: data.active ?? true,
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration,
      notes: data.notes,
    },
  });
  if (session) revalidatePath(`/patients/${session.patientId}`);
}

export async function toggleSessionMedication(
  sessionMedId: string,
  active: boolean,
) {
  const sm = await prisma.sessionMedication.update({
    where: { id: sessionMedId },
    data: { active },
    include: { session: { select: { patientId: true } } },
  });
  revalidatePath(`/patients/${sm.session.patientId}`);
}

export async function removeSessionMedication(sessionMedId: string) {
  const sm = await prisma.sessionMedication.delete({
    where: { id: sessionMedId },
    include: { session: { select: { patientId: true } } },
  });
  revalidatePath(`/patients/${sm.session.patientId}`);
}

export async function updateSessionMedication(
  sessionMedId: string,
  data: {
    active?: boolean;
    dosage?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
  },
) {
  const sm = await prisma.sessionMedication.update({
    where: { id: sessionMedId },
    data,
    include: { session: { select: { patientId: true } } },
  });
  revalidatePath(`/patients/${sm.session.patientId}`);
}
