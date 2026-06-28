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
  investigationSheets?: {
    date: string;
    values: Record<string, string>;
    extras?: { name: string; result: string }[];
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

  // Create investigation sheets if provided
  if (data.investigationSheets?.length) {
    // Fields that are Float? in the schema — must be parsed from string
    const floatFields = new Set([
      "hb",
      "wbc",
      "neutrophils",
      "lymphocytes",
      "platelets",
      "esr",
      "crp",
      "glucose",
      "glucosePP",
      "hba1c",
      "na",
      "k",
      "ca",
      "po4",
      "mg",
      "albumin",
      "sgot",
      "sgpt",
      "totalBilirubin",
      "directBilirubin",
      "ggt",
      "alp",
      "urea",
      "creatinine",
      "gfr",
      "uricAcid",
      "cholesterol",
      "ldl",
      "hdl",
      "tg",
      "ft3",
      "ft4",
      "tsh",
      "pth",
      "urineRbc",
      "pusCells",
      "inr",
      "iron",
      "ferritin",
      "tibc",
      "tsat",
      "psaFree",
      "psaTotal",
      "psaRatio",
      "c3",
      "c4",
    ]);

    for (const sheet of data.investigationSheets) {
      const { date: sheetDate, values, extras } = sheet;

      // Convert values to proper types
      const typedValues: Record<string, number | string> = {};
      for (const [key, val] of Object.entries(values)) {
        if (floatFields.has(key)) {
          const num = parseFloat(val);
          if (!isNaN(num)) typedValues[key] = num;
        } else {
          typedValues[key] = val;
        }
      }

      await prisma.investigationSheet.create({
        data: {
          sessionId: session.id,
          date: new Date(sheetDate),
          ...typedValues,
          extraInvestigations: extras?.length ? { create: extras } : undefined,
        } as Parameters<typeof prisma.investigationSheet.create>[0]["data"],
      });
    }
  }

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

// ==============================
// Investigation Sheets
// ==============================

export async function addInvestigationSheet(
  sessionId: string,
  data: Record<string, unknown> & { date: string },
) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { patientId: true },
  });

  const { date, extraInvestigations, ...labFields } = data as Record<
    string,
    unknown
  > & {
    date: string;
    extraInvestigations?: { name: string; result?: string }[];
  };

  await prisma.investigationSheet.create({
    data: {
      sessionId,
      date: new Date(date),
      ...labFields,
      extraInvestigations: extraInvestigations?.length
        ? { create: extraInvestigations }
        : undefined,
    } as Parameters<typeof prisma.investigationSheet.create>[0]["data"],
  });

  if (session) revalidatePath(`/patients/${session.patientId}`);
}

export async function deleteInvestigationSheet(sheetId: string) {
  const sheet = await prisma.investigationSheet.delete({
    where: { id: sheetId },
    include: { session: { select: { patientId: true } } },
  });
  revalidatePath(`/patients/${sheet.session.patientId}`);
}
