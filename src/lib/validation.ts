import { z } from "zod";

// ==============================
// Helpers
// ==============================

/** Extract flat field→message map from a failed safeParse result */
export function getFieldErrors(result: {
  success: boolean;
  error?: z.ZodError;
}): Record<string, string> {
  if (result.success || !result.error) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

// Optional numeric string — empty string is ok, non-numeric is error
const optionalNumericString = z
  .string()
  .optional()
  .refine((v) => !v || v.trim() === "" || !isNaN(Number(v)), {
    message: "Must be a number",
  });

// BP format: digits/digits (e.g. 120/80), both sides required if any input
const optionalBP = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (!v || v.trim() === "") return true;
      return /^\d{2,3}\/\d{2,3}$/.test(v.trim());
    },
    { message: "Enter both systolic and diastolic values" },
  );

// ==============================
// Create Session
// ==============================

export const createSessionSchema = z.object({
  date: z.date({ message: "Date is required" }),
  bloodPressure: optionalBP,
  pulse: optionalNumericString,
  temperature: optionalNumericString,
  respRate: optionalNumericString,
  examination: z.string().optional(),
});

// ==============================
// Patient Demographics
// ==============================

export const patientDemographicsSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  dateOfBirth: z.date().optional(),
  sex: z.string().optional(),
  maritalStatus: z.string().optional(),
  offsprings: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        v.trim() === "" ||
        (!isNaN(Number(v)) && Number(v) >= 0 && Number.isInteger(Number(v))),
      { message: "Must be a non-negative whole number" },
    ),
  occupation: z.string().optional(),
  residence: z.string().optional(),
});

// ==============================
// General Examination
// ==============================

export const examinationSchema = z.object({
  bloodPressure: optionalBP,
  pulse: optionalNumericString,
  supine: z.string().optional(),
  respRate: optionalNumericString,
  temperature: optionalNumericString,
});

// ==============================
// Previous Medication
// ==============================

export const previousMedicationSchema = z.object({
  drug: z.string().min(2, "Drug name must be at least 2 characters"),
  frequency: z.string().min(1, "Frequency is required"),
});

// ==============================
// Medication Catalog
// ==============================

export const medicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  dosage: z.string().optional(),
  form: z.string().optional(),
});

// ==============================
// Investigation (standalone)
// ==============================

export const investigationSchema = z.object({
  date: z.date({ message: "Date is required" }),
  invest: z.string().min(2, "Investigation name must be at least 2 characters"),
  report: z.string().optional(),
});
