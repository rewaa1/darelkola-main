// Canonical pharmaceutical dosage forms. Stored as these English keys on the
// Medication record; displayed via the `medForms` translation namespace.
export const MEDICATION_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "suspension",
  "injection",
  "cream",
  "ointment",
  "drops",
  "inhaler",
  "suppository",
  "sachet",
] as const;

export type MedicationForm = (typeof MEDICATION_FORMS)[number];
