"use client";

import { InvestigationSheet, ExtraInvestigation } from "@prisma/client";
import { useTranslations, useFormatter } from "next-intl";

export const labCategories = [
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

export function InvestigationSheetView({
  sheet,
}: {
  sheet: InvestigationSheet & { extraInvestigations: ExtraInvestigation[] };
}) {
  const t = useTranslations("session");
  const tCat = useTranslations("session.categories");
  const format = useFormatter();
  const sheetData = sheet as Record<string, unknown>;

  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm font-medium mb-3">
        {t("labOn", {
          date: format.dateTime(new Date(sheet.date), {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        })}
      </div>
      {labCategories.map((category) => {
        const filledFields = category.fields.filter(
          (f) => sheetData[f.key] != null && sheetData[f.key] !== "",
        );
        if (filledFields.length === 0) return null;
        return (
          <div key={category.key} className="mb-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {tCat(category.key)}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filledFields.map((f) => (
                <div key={f.key} className="text-sm border rounded px-2 py-1">
                  <span className="text-muted-foreground">{f.label}: </span>
                  <span className="font-medium">
                    {String(sheetData[f.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {sheet.extraInvestigations.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {t("extra")}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {sheet.extraInvestigations.map((ei) => (
              <div key={ei.id} className="text-sm border rounded px-2 py-1">
                <span className="text-muted-foreground">{ei.name}: </span>
                <span className="font-medium">{ei.result || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
