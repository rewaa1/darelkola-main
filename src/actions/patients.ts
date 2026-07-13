"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { paginationToSkipTake, buildPaginatedResult } from "@/lib/pagination";
import {
  type ActionResult,
  actionError,
  runAction,
} from "@/lib/action-result";

// ===========================================
// Types
// ===========================================

export type CreatePatientInput = {
  fullName: string;
  phoneNumber: string;
  dateOfBirth?: string;
  sex?: string;
  maritalStatus?: string;
  offsprings?: number;
  occupation?: string;
  residence?: string;
  registeredById?: string; // receptionist who registered the patient
};

// ===========================================
// Create Patient
// ===========================================

export async function createPatient(
  data: CreatePatientInput,
): Promise<ActionResult<{ patientId: string }>> {
  return runAction(async () => {
    // Check if phone number already exists
    const existing = await prisma.personalHistory.findFirst({
      where: { phoneNumber: data.phoneNumber },
    });

    if (existing) actionError("patientPhoneExists");

    const patient = await prisma.patient.create({
      data: {
        registeredById: data.registeredById,
        personalHistory: {
          create: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            sex: data.sex,
            maritalStatus: data.maritalStatus,
            offsprings: data.offsprings,
            occupation: data.occupation,
            residence: data.residence,
          },
        },
      },
    });

    revalidatePath("/patients");
    return { patientId: patient.id };
  });
}

// ===========================================
// Get All Patients (Recent)
// ===========================================

export async function getAllPatients(limit: number = 50) {
  const patients = await prisma.patient.findMany({
    include: {
      personalHistory: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return patients;
}

// ===========================================
// Search Patients
// ===========================================

export async function searchPatients(query: string) {
  if (!query || query.length < 2) {
    return [];
  }

  const patients = await prisma.patient.findMany({
    where: {
      personalHistory: {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { phoneNumber: { contains: query } },
        ],
      },
    },
    include: {
      personalHistory: true,
    },
    take: 20,
    orderBy: {
      personalHistory: {
        fullName: "asc",
      },
    },
  });

  return patients;
}

// ===========================================
// Get Paginated Patients
// ===========================================

export async function getPaginatedPatients(params: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const { skip, take } = paginationToSkipTake(params);

  const where =
    params.search && params.search.length >= 2
      ? {
          personalHistory: {
            OR: [
              {
                fullName: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
              { phoneNumber: { contains: params.search } },
            ],
          },
        }
      : {};

  const [data, totalCount] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: { personalHistory: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.patient.count({ where }),
  ]);

  return buildPaginatedResult(data, totalCount, params);
}

// ===========================================
// Get Patient by ID (with all relations)
// ===========================================

// How many sessions the timeline loads at a time. The rest arrive on demand via
// getPatientSessionsPage, so opening a long-history patient no longer serializes
// every visit up front.
const SESSIONS_PAGE_SIZE = 5;

// One session with everything the timeline and session detail render. Kept in
// sync with SessionWithRelations in components/patients/sessions/types.ts.
const sessionPageInclude = {
  sessionMedications: { include: { medication: true } },
  investigationSheets: {
    include: { extraInvestigations: true },
    orderBy: { date: "desc" },
  },
  // The assistant's note this session claimed, if any, so the session detail can
  // show it alongside the doctor's own record.
  preAssessment: {
    include: { assistant: { select: { name: true } } },
  },
} satisfies Prisma.SessionInclude;

export type PatientSessionRow = Prisma.SessionGetPayload<{
  include: typeof sessionPageInclude;
}>;

export type PatientSessionPage = {
  items: PatientSessionRow[];
  hasMore: boolean;
};

/**
 * One page of a patient's sessions, newest first. Cursor is the id of the last
 * session already shown; omit it for the first page. Fetches one extra row to
 * tell the caller whether a "view more" is warranted without a second count.
 */
export async function getPatientSessionsPage(
  patientId: string,
  cursor?: string,
): Promise<PatientSessionPage> {
  const rows = await prisma.session.findMany({
    where: { patientId },
    // id is the tiebreaker so the cursor is deterministic when two sessions
    // share a date.
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: SESSIONS_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: sessionPageInclude,
  });

  const hasMore = rows.length > SESSIONS_PAGE_SIZE;
  return { items: hasMore ? rows.slice(0, SESSIONS_PAGE_SIZE) : rows, hasMore };
}

export type PatientMedicationRow = Prisma.SessionMedicationGetPayload<{
  include: { medication: true; session: { select: { id: true; date: true } } };
}>;

/**
 * Every medication row across all of a patient's sessions, newest first —
 * without the examination text, lab sheets, or pre-assessments the timeline
 * carries. This is the full-history source the medications view and carry-
 * forward need, kept correct even while the timeline itself is paginated.
 */
export async function getPatientMedications(
  patientId: string,
): Promise<PatientMedicationRow[]> {
  return prisma.sessionMedication.findMany({
    where: { session: { patientId } },
    include: {
      medication: true,
      session: { select: { id: true, date: true } },
    },
    orderBy: { session: { date: "desc" } },
  });
}

export async function getPatient(patientId: string) {
  const [patient, sessionPage, medications] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        personalHistory: true,
        registeredBy: { select: { name: true } },
        previousMedications: true,
        investigations: {
          orderBy: { date: "desc" },
        },
        // Every sheet the patient has, linked or not — the Lab Results tab needs
        // the full history so the doctor can compare across visits.
        investigationSheets: {
          include: {
            extraInvestigations: true,
            session: { select: { id: true, date: true } },
          },
          orderBy: { date: "desc" },
        },
        appointments: {
          orderBy: { date: "desc" },
          include: {
            clinic: true,
          },
        },
      },
    }),
    // Only the first page of the timeline, plus the full medication history —
    // the two consumers that used to force loading every session eagerly.
    getPatientSessionsPage(patientId),
    getPatientMedications(patientId),
  ]);

  if (!patient) return null;

  return {
    ...patient,
    sessions: sessionPage.items,
    sessionsHasMore: sessionPage.hasMore,
    medications,
  };
}

// ===========================================
// Get Patient History (Appointments)
// ===========================================

export async function getPatientHistory(patientId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { patientId },
    orderBy: { date: "desc" },
    include: {
      clinic: true,
    },
  });

  return appointments;
}

// ===========================================
// Find Patient by Phone
// ===========================================

export async function findPatientByPhone(phoneNumber: string) {
  const patient = await prisma.patient.findFirst({
    where: {
      personalHistory: {
        phoneNumber,
      },
    },
    include: {
      personalHistory: true,
    },
  });

  return patient;
}

// ===========================================
// Update Patient (Demographics)
// ===========================================

export async function updatePatient(
  patientId: string,
  data: Partial<CreatePatientInput>,
) {
  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      personalHistory: {
        update: {
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth)
            : undefined,
          sex: data.sex,
          maritalStatus: data.maritalStatus,
          offsprings: data.offsprings,
          occupation: data.occupation,
          residence: data.residence,
        },
      },
    },
    include: {
      personalHistory: true,
    },
  });

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  return patient;
}

// ===========================================
// Update Medical History
// ===========================================

export type UpdateMedicalHistoryInput = {
  presentHistory?: string;
  pastHistory?: string;
  familyHistory?: string;
};

export async function updateMedicalHistory(
  patientId: string,
  data: UpdateMedicalHistoryInput,
) {
  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      personalHistory: {
        update: {
          presentHistory: data.presentHistory,
          pastHistory: data.pastHistory,
          familyHistory: data.familyHistory,
        },
      },
    },
    include: { personalHistory: true },
  });

  revalidatePath(`/patients/${patientId}`);
  return patient;
}

// ===========================================
// Update General Appearance
// ===========================================

export type UpdateGeneralAppearanceInput = {
  built?: string;
  behavior?: string;
  intelligence?: string;
  facies?: string;
  decubitus?: string;
};

export async function updateGeneralAppearance(
  patientId: string,
  data: UpdateGeneralAppearanceInput,
) {
  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      personalHistory: {
        update: data,
      },
    },
    include: { personalHistory: true },
  });

  revalidatePath(`/patients/${patientId}`);
  return patient;
}

// ===========================================
// Update General Examination
// ===========================================

export type UpdateGeneralExamInput = {
  bloodPressure?: string;
  pulse?: string;
  supine?: string;
  respRate?: string;
  temperature?: string;
  headAndNeck?: string;
  lymphNodes?: string;
  neckVeins?: string;
  thyroid?: string;
  upperLimb?: string;
  lowerLimb?: string;
  peripheralPulse?: string;
  cardioExam?: string;
  chestExam?: string;
  abdomenExam?: string;
  neuroExam?: string;
  provisionalDx?: string;
  comments?: string;
};

export async function updateGeneralExamination(
  patientId: string,
  data: UpdateGeneralExamInput,
) {
  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      personalHistory: {
        update: data,
      },
    },
    include: { personalHistory: true },
  });

  revalidatePath(`/patients/${patientId}`);
  return patient;
}

// ===========================================
// Previous Medications CRUD
// ===========================================

export async function addPreviousMedication(
  patientId: string,
  data: { drug: string; frequency: string },
) {
  const medication = await prisma.previousMedication.create({
    data: {
      patientId,
      drug: data.drug,
      frequency: data.frequency,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return medication;
}

export async function deletePreviousMedication(medicationId: string) {
  const medication = await prisma.previousMedication.delete({
    where: { id: medicationId },
  });

  revalidatePath(`/patients/${medication.patientId}`);
  return medication;
}

// ===========================================
// Investigations CRUD
// ===========================================

export async function addInvestigation(
  patientId: string,
  data: {
    date: string;
    invest: string;
    report?: string;
    fileUrl?: string;
    fileName?: string;
  },
) {
  const investigation = await prisma.investigation.create({
    data: {
      patientId,
      date: new Date(data.date),
      invest: data.invest,
      report: data.report,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return investigation;
}

export async function deleteInvestigation(investigationId: string) {
  const investigation = await prisma.investigation.delete({
    where: { id: investigationId },
  });

  revalidatePath(`/patients/${investigation.patientId}`);
  return investigation;
}
