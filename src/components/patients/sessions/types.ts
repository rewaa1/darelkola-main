import {
  Session,
  SessionMedication,
  Medication,
  SessionInvestigation,
  InvestigationCatalog,
  InvestigationSheet,
  ExtraInvestigation,
  PreAssessment,
} from "@prisma/client";

export type SessionWithRelations = Session & {
  sessionMedications: (SessionMedication & { medication: Medication })[];
  // Investigations requested at this session. Optional because not every loader
  // includes it (same pattern as preAssessment).
  sessionInvestigations?: (SessionInvestigation & {
    investigation: InvestigationCatalog;
  })[];
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

// A requested investigation being assembled in the new-session form, before it
// is saved. Mirrors MedEntry.
export interface InvestigationEntry {
  investigation: InvestigationCatalog;
  notes: string;
}
