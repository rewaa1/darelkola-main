// Field definitions for the InvestigationSheet (lab results) model.
// Pure data — imported by both server actions and client components.

export interface LabField {
  key: string;
  label: string;
}

export interface LabCategory {
  key: string;
  label: string;
  fields: LabField[];
}

export const labCategories: LabCategory[] = [
  {
    key: "hematology",
    label: "Hematology",
    fields: [
      { key: "hb", label: "HB" },
      { key: "wbc", label: "WBC" },
      { key: "neutrophils", label: "Neutrophils" },
      { key: "lymphocytes", label: "Lymphocytes" },
      { key: "platelets", label: "Platelets" },
      { key: "esr", label: "ESR" },
      { key: "crp", label: "CRP" },
    ],
  },
  {
    key: "biochemistry",
    label: "Biochemistry",
    fields: [
      { key: "glucose", label: "Glucose" },
      { key: "glucosePP", label: "Glucose PP" },
      { key: "hba1c", label: "HbA1c" },
      { key: "na", label: "Na" },
      { key: "k", label: "K" },
      { key: "ca", label: "Ca" },
      { key: "po4", label: "Po4" },
      { key: "mg", label: "Mg" },
      { key: "albumin", label: "Albumin" },
      { key: "sgot", label: "SGOT" },
      { key: "sgpt", label: "SGPT" },
      { key: "totalBilirubin", label: "Total Bilirubin" },
      { key: "directBilirubin", label: "Direct Bilirubin" },
      { key: "ggt", label: "GGT" },
      { key: "alp", label: "ALP" },
      { key: "urea", label: "Urea" },
      { key: "creatinine", label: "Creatinine" },
      { key: "gfr", label: "GFR" },
      { key: "uricAcid", label: "Uric Acid" },
      { key: "cholesterol", label: "Cholesterol" },
      { key: "ldl", label: "LDL" },
      { key: "hdl", label: "HDL" },
      { key: "tg", label: "TG" },
      { key: "ft3", label: "FT3" },
      { key: "ft4", label: "FT4" },
      { key: "tsh", label: "TSH" },
      { key: "pth", label: "PTH" },
    ],
  },
  {
    key: "urine",
    label: "Urine",
    fields: [
      { key: "urineRbc", label: "RBC" },
      { key: "pusCells", label: "Pus Cells" },
      { key: "crystals", label: "Crystals" },
      { key: "urineAlb", label: "Albumin" },
      { key: "urinePC", label: "PC" },
      { key: "urineCulture", label: "Culture" },
    ],
  },
  {
    key: "virology",
    label: "Virology",
    fields: [
      { key: "hbsAg", label: "HBsAg" },
      { key: "hcAb", label: "HCAb" },
      { key: "hivAb", label: "HIVAb" },
    ],
  },
  {
    key: "drugIronPsa",
    label: "Drug / Iron / PSA",
    fields: [
      { key: "inr", label: "INR" },
      { key: "iron", label: "Iron" },
      { key: "ferritin", label: "Ferritin" },
      { key: "tibc", label: "TIBC" },
      { key: "tsat", label: "TSAT" },
      { key: "psaFree", label: "PSA Free" },
      { key: "psaTotal", label: "PSA Total" },
      { key: "psaRatio", label: "PSA Ratio" },
      { key: "drugLevel", label: "Drug Level" },
    ],
  },
  {
    key: "immunology",
    label: "Immunology",
    fields: [
      { key: "ana", label: "ANA" },
      { key: "antiDna", label: "Anti-DNA" },
      { key: "c3", label: "C3" },
      { key: "c4", label: "C4" },
      { key: "rf", label: "RF" },
      { key: "antiCcp", label: "Anti-CCP" },
      { key: "ancaC", label: "ANCA-C" },
      { key: "ancaP", label: "ANCA-P" },
      { key: "spep", label: "SPEP" },
    ],
  },
];

// Fields typed `Float?` in schema.prisma — anything else is `String?`.
export const LAB_FLOAT_FIELDS = new Set([
  "hb",
  "wbc",
  "neutrophils",
  "lymphocytes",
  "platelets",
  "esr",
  "crp",
  "glucose",
  "glucosePP",
  "hba1c",
  "na",
  "k",
  "ca",
  "po4",
  "mg",
  "albumin",
  "sgot",
  "sgpt",
  "totalBilirubin",
  "directBilirubin",
  "ggt",
  "alp",
  "urea",
  "creatinine",
  "gfr",
  "uricAcid",
  "cholesterol",
  "ldl",
  "hdl",
  "tg",
  "ft3",
  "ft4",
  "tsh",
  "pth",
  "urineRbc",
  "pusCells",
  "inr",
  "iron",
  "ferritin",
  "tibc",
  "tsat",
  "psaFree",
  "psaTotal",
  "psaRatio",
  "c3",
  "c4",
]);

// Every writable lab column, so submitted values can be filtered against a
// known set before they reach Prisma.
const LAB_FIELD_KEYS = new Set(
  labCategories.flatMap((c) => c.fields.map((f) => f.key)),
);

export function isLabField(key: string) {
  return LAB_FIELD_KEYS.has(key);
}

/**
 * Turn a form's `Record<string, string>` into Prisma-ready column values:
 * unknown keys dropped, blanks dropped, float columns parsed to numbers.
 */
export function coerceLabValues(
  values: Record<string, string>,
): Record<string, number | string> {
  const coerced: Record<string, number | string> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!isLabField(key)) continue;
    const value = raw?.trim();
    if (!value) continue;

    if (LAB_FLOAT_FIELDS.has(key)) {
      const num = Number.parseFloat(value);
      if (!Number.isNaN(num)) coerced[key] = num;
    } else {
      coerced[key] = value;
    }
  }
  return coerced;
}
