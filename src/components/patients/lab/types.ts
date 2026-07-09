import { InvestigationSheet, ExtraInvestigation } from "@prisma/client";

// A sheet as loaded for the patient-level Lab Results tab: it carries the
// session that claimed it, or null while it is still waiting for one.
export type LabSheet = InvestigationSheet & {
  extraInvestigations: ExtraInvestigation[];
  session: { id: string; date: Date } | null;
};

// A sheet as rendered anywhere (session detail included) — no session needed.
export type ViewableSheet = InvestigationSheet & {
  extraInvestigations: ExtraInvestigation[];
};

// One sheet being filled in by the form, before it is saved.
export interface InvestigationSheetEntry {
  date: Date;
  values: Record<string, string>;
  extras: { name: string; result: string }[];
}
