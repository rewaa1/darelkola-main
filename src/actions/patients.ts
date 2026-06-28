"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { paginationToSkipTake, buildPaginatedResult } from "@/lib/pagination";

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
};

// ===========================================
// Create Patient
// ===========================================

export async function createPatient(data: CreatePatientInput) {
  // Check if phone number already exists
  const existing = await prisma.personalHistory.findFirst({
    where: { phoneNumber: data.phoneNumber },
  });

  if (existing) {
    throw new Error("Patient with this phone number already exists");
  }

  const patient = await prisma.patient.create({
    data: {
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
    include: {
      personalHistory: true,
    },
  });

  revalidatePath("/patients");
  return patient;
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

export async function getPatient(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      personalHistory: true,
      previousMedications: true,
      investigations: {
        orderBy: { date: "desc" },
      },
      sessions: {
        orderBy: { date: "desc" },
        include: {
          sessionMedications: {
            include: { medication: true },
          },
          investigationSheets: {
            include: { extraInvestigations: true },
            orderBy: { date: "desc" },
          },
        },
      },
      appointments: {
        orderBy: { date: "desc" },
        include: {
          clinic: true,
        },
      },
    },
  });

  return patient;
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
