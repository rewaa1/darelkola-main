"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ===========================================
// Doctor-only guard
// ===========================================

async function assertDoctor() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "DOCTOR") {
    throw new Error("Only doctors can manage receptionists");
  }
  return user;
}

// ===========================================
// Reads
// ===========================================

/** All receptionists (active + inactive) — for the Settings management view. */
export async function getReceptionists() {
  return prisma.receptionist.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

/** Active receptionists only — for the action picker. */
export async function getActiveReceptionists() {
  return prisma.receptionist.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// ===========================================
// Mutations (doctor-only)
// ===========================================

export async function createReceptionist(data: { name: string }) {
  await assertDoctor();
  const name = data.name.trim();
  if (!name) throw new Error("Name is required");

  const receptionist = await prisma.receptionist.create({
    data: { name },
  });
  revalidatePath("/settings");
  return receptionist;
}

export async function renameReceptionist(id: string, name: string) {
  await assertDoctor();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  const receptionist = await prisma.receptionist.update({
    where: { id },
    data: { name: trimmed },
  });
  revalidatePath("/settings");
  return receptionist;
}

/**
 * Activate / deactivate a receptionist. We never hard-delete so past actions
 * keep pointing at a real name; deactivated names just drop out of the picker.
 */
export async function setReceptionistActive(id: string, active: boolean) {
  await assertDoctor();
  const receptionist = await prisma.receptionist.update({
    where: { id },
    data: { active },
  });
  revalidatePath("/settings");
  return receptionist;
}
