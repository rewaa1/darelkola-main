"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { paginationToSkipTake, buildPaginatedResult } from "@/lib/pagination";

// ==============================
// Global Medications
// ==============================

export async function getMedications() {
  return prisma.medication.findMany({
    orderBy: { name: "asc" },
  });
}

export async function searchMedications(query: string) {
  return prisma.medication.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: 20,
  });
}

// ==============================
// Get Paginated Medications
// ==============================

export async function getPaginatedMedications(params: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const { skip, take } = paginationToSkipTake(params);

  const where = params.search
    ? { name: { contains: params.search, mode: "insensitive" as const } }
    : {};

  const [data, totalCount] = await Promise.all([
    prisma.medication.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.medication.count({ where }),
  ]);

  return buildPaginatedResult(data, totalCount, params);
}

export async function createMedication(data: {
  name: string;
  dosage?: string;
  form?: string;
}) {
  const medication = await prisma.medication.create({
    data: {
      name: data.name,
      dosage: data.dosage,
      form: data.form,
    },
  });
  revalidatePath("/medications");
  return medication;
}

export async function deleteMedication(id: string) {
  await prisma.medication.delete({ where: { id } });
  revalidatePath("/medications");
}
