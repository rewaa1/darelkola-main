"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { coerceLabValues } from "@/lib/lab-fields";

type SheetCreateData = Parameters<
  typeof prisma.investigationSheet.create
>[0]["data"];

export interface InvestigationSheetInput {
  date: string; // yyyy-MM-dd — when the tests were performed
  values: Record<string, string>;
  extras?: { name: string; result: string }[];
}

/**
 * Create one or more sheets for a patient. Left unlinked (sessionId null)
 * until a session claims them — see createSession.
 */
export async function createInvestigationSheets(
  patientId: string,
  sheets: InvestigationSheetInput[],
) {
  if (!sheets.length) return;

  await prisma.$transaction(
    sheets.map((sheet) => {
      const extras = (sheet.extras ?? [])
        .map((e) => ({ name: e.name.trim(), result: e.result.trim() }))
        .filter((e) => e.name);

      return prisma.investigationSheet.create({
        data: {
          patientId,
          date: new Date(sheet.date),
          ...coerceLabValues(sheet.values),
          extraInvestigations: extras.length ? { create: extras } : undefined,
        } as SheetCreateData,
      });
    }),
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/queue");
}

export async function deleteInvestigationSheet(sheetId: string) {
  const sheet = await prisma.investigationSheet.delete({
    where: { id: sheetId },
    select: { patientId: true },
  });
  revalidatePath(`/patients/${sheet.patientId}`);
  revalidatePath("/queue");
}
