import {
  Session,
  SessionMedication,
  Medication,
  InvestigationSheet,
  ExtraInvestigation,
} from "@prisma/client";

export type SessionWithRelations = Session & {
  sessionMedications: (SessionMedication & { medication: Medication })[];
  investigationSheets: (InvestigationSheet & {
    extraInvestigations: ExtraInvestigation[];
  })[];
};

export interface MedEntry {
  medication: Medication;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
  active: boolean;
}

export interface InvestigationSheetEntry {
  date: Date;
  values: Record<string, string>;
  extras: { name: string; result: string }[];
}
