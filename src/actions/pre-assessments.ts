"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth";
import {
  type ActionResult,
  actionError,
  runAction,
} from "@/lib/action-result";

// ==============================
// Pre-assessments (assistant doctor)
// ==============================
//
// The assistant's vitals + examination, taken after check-in and before the
// doctor's session exists. Keyed to the appointment (the visit), one per visit.
// The doctor's session claims it — see createSession in sessions.ts.

export interface PreAssessmentInput {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  respRate?: string;
  examination?: string;
}

/** Empty string means "cleared" → null; undefined means "leave as-is" is not
 *  possible through upsert, so a full write always sends every field. */
function toValues(data: PreAssessmentInput) {
  const clean = (v?: string) => {
    const t = v?.trim();
    return t ? t : null;
  };
  return {
    bloodPressure: clean(data.bloodPressure),
    pulse: clean(data.pulse),
    temperature: clean(data.temperature),
    respRate: clean(data.respRate),
    examination: clean(data.examination),
  };
}

export async function getPreAssessmentForAppointment(appointmentId: string) {
  // Read is open to any signed-in staff: the doctor consults it while writing
  // his session, the assistant re-opens his own note to correct it.
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return prisma.preAssessment.findUnique({
    where: { appointmentId },
    include: { assistant: { select: { name: true } } },
  });
}

export async function upsertPreAssessment(
  appointmentId: string,
  data: PreAssessmentInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const assistant = await requireRole("ASSISTANT");

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, patientId: true, status: true },
    });

    if (!appointment) actionError("appointmentNotFound");
    if (!appointment.patientId) actionError("registerPatientFirst");

    // Frozen the moment the patient reaches the doctor. Editing afterwards could
    // change a note the doctor has already read and acted on.
    if (
      appointment.status === "WITH_DOCTOR" ||
      appointment.status === "COMPLETED"
    ) {
      actionError("assessmentLocked");
    }

    const values = toValues(data);

    await prisma.preAssessment.upsert({
      where: { appointmentId },
      update: { ...values, assistantId: assistant.id },
      create: {
        appointmentId,
        patientId: appointment.patientId,
        assistantId: assistant.id,
        ...values,
      },
    });

    revalidatePath("/assistant");
    revalidatePath("/queue");
    revalidatePath(`/patients/${appointment.patientId}`);
  });
}
