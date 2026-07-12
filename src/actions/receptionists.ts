"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  type ActionResult,
  actionError,
  runAction,
} from "@/lib/action-result";

// ===========================================
// Doctor-only guard
// ===========================================

async function assertDoctor() {
  const user = await getCurrentUser();
  if (!user) actionError("unauthorized");
  if (user.role !== "DOCTOR") actionError("doctorsOnly");
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

export async function createReceptionist(data: {
  name: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    await assertDoctor();
    const name = data.name.trim();
    if (!name) actionError("nameRequired");

    await prisma.receptionist.create({ data: { name } });
    revalidatePath("/settings");
  });
}

export async function renameReceptionist(
  id: string,
  name: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await assertDoctor();
    const trimmed = name.trim();
    if (!trimmed) actionError("nameRequired");

    await prisma.receptionist.update({
      where: { id },
      data: { name: trimmed },
    });
    revalidatePath("/settings");
  });
}

/**
 * Activate / deactivate a receptionist. We never hard-delete so past actions
 * keep pointing at a real name; deactivated names just drop out of the picker.
 */
export async function setReceptionistActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    await assertDoctor();
    await prisma.receptionist.update({
      where: { id },
      data: { active },
    });
    revalidatePath("/settings");
  });
}
