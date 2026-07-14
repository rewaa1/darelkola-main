"use server";

import { Prisma, type InvestigationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicDay } from "@/lib/clinic-day";
import { revalidatePath } from "next/cache";

// ==============================
// Catalog (the searchable list of orderable tests)
// ==============================

export async function searchInvestigationCatalog(query: string) {
  return prisma.investigationCatalog.findMany({
    where: { name: { contains: query, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: 20,
  });
}

export async function createInvestigationCatalog(data: {
  name: string;
  category?: InvestigationCategory;
}) {
  return prisma.investigationCatalog.create({
    data: { name: data.name, category: data.category ?? "LAB" },
  });
}

// ==============================
// Requests (a test asked for on a session)
// ==============================

export type PatientInvestigationRow = Prisma.SessionInvestigationGetPayload<{
  include: {
    investigation: true;
    session: { select: { id: true; date: true } };
  };
}>;

/**
 * Every investigation ever requested for a patient, newest first, with its
 * catalog entry and the session it was asked on. Full history — the pending
 * section and any per-session view read from this.
 */
export async function getPatientInvestigationRequests(
  patientId: string,
): Promise<PatientInvestigationRow[]> {
  return prisma.sessionInvestigation.findMany({
    where: { session: { patientId } },
    include: {
      investigation: true,
      session: { select: { id: true, date: true } },
    },
    orderBy: { requestedAt: "desc" },
  });
}

export async function addSessionInvestigation(
  sessionId: string,
  data: { investigationId: string; notes?: string },
) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { patientId: true },
  });
  if (!session) return;
  await prisma.sessionInvestigation.create({
    data: {
      sessionId,
      investigationId: data.investigationId,
      notes: data.notes,
    },
  });
  revalidatePath(`/patients/${session.patientId}`);
}

export async function removeSessionInvestigation(id: string) {
  const row = await prisma.sessionInvestigation.delete({
    where: { id },
    include: { session: { select: { patientId: true } } },
  });
  revalidatePath(`/patients/${row.session.patientId}`);
}

/**
 * Flip a requested test between pending and resulted. Stamps the resulted date
 * with the clinic's working day (shifts run past midnight), clears it when sent
 * back to pending.
 */
export async function setInvestigationResulted(id: string, resulted: boolean) {
  const row = await prisma.sessionInvestigation.update({
    where: { id },
    data: {
      status: resulted ? "RESULTED" : "REQUESTED",
      resultedAt: resulted ? clinicDay() : null,
    },
    include: { session: { select: { patientId: true } } },
  });
  revalidatePath(`/patients/${row.session.patientId}`);
}
