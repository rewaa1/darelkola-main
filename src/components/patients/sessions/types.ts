import {
  Session,
  SessionMedication,
  Medication,
  InvestigationSheet,
  ExtraInvestigation,
  PreAssessment,
} from "@prisma/client";

export type SessionWithRelations = Session & {
  sessionMedications: (SessionMedication & { medication: Medication })[];
  investigationSheets: (InvestigationSheet & {
    extraInvestigations: ExtraInvestigation[];
  })[];
  // Present when the assistant pre-assessed this visit. Nullable — most visits
  // have no assistant on duty.
  preAssessment?: (PreAssessment & { assistant: { name: string } | null }) | null;
};

export interface MedEntry {
  medication: Medication;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
  active: boolean;
}
