"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Medication } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createSession } from "@/actions/sessions";
import { clinicDayLocal } from "@/lib/clinic-day";
import { createSessionSchema, getFieldErrors } from "@/lib/validation";
import { searchMedications, createMedication } from "@/actions/medications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SessionWithRelations, MedEntry } from "./types";
import { SessionDetailsCard } from "./SessionDetailsCard";
import { MedicationsCard } from "./MedicationsCard";
import { PreAssessmentView, PreAssessmentLike } from "./PreAssessmentView";
import { printPrescription, hasActiveMeds } from "./print-rx";
import { SessionLabResults } from "../lab/SessionLabResults";
import { LabSheet } from "../lab/types";

// ==============================
// Helper: collect all unique meds from sessions
// ==============================

function collectPatientMeds(sessions: SessionWithRelations[]): MedEntry[] {
  const medsMap = new Map<string, MedEntry>();

  // Process newest sessions first — keep latest dosage/frequency/active state
  sessions.forEach((session) => {
    session.sessionMedications.forEach((sm) => {
      if (!medsMap.has(sm.medicationId)) {
        medsMap.set(sm.medicationId, {
          medication: sm.medication,
          dosage: sm.dosage || sm.medication.dosage || "",
          frequency: sm.frequency || "",
          duration: sm.duration || "",
          notes: sm.notes || "",
          active: sm.active,
        });
      }
    });
  });

  return Array.from(medsMap.values());
}

// ==============================
// Main Form
// ==============================

interface AddSessionFormProps {
  patientId: string;
  patientName: string;
  sessions: SessionWithRelations[];
  labSheets: LabSheet[];
  lastClinicId: string | null;
  clinics: { id: string; name: string }[];
  appointmentId?: string;
  currentPreAssessment?: PreAssessmentLike | null;
  onCancel: () => void;
}

export function AddSessionForm({
  patientId,
  patientName,
  sessions,
  labSheets,
  lastClinicId,
  clinics,
  appointmentId,
  currentPreAssessment,
  onCancel,
}: AddSessionFormProps) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  // The session just created, held so the doctor can print its prescription
  // straight away rather than reopening the profile. Only set when it has
  // active medications worth printing.
  const [createdSession, setCreatedSession] = useState<Awaited<
    ReturnType<typeof createSession>
  > | null>(null);

  // Session fields. The date is the working day, not the calendar day: a
  // session written at 2 AM belongs to the shift that opened the evening
  // before, and dating it tomorrow would detach it from the appointment.
  const [date, setDate] = useState<Date | undefined>(() => clinicDayLocal());
  const [examination, setExamination] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [respRate, setRespRate] = useState("");

  // Clinic (auto-set from last appointment, or user picks)
  const [clinicId, setClinicId] = useState(lastClinicId || "");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Errors are only recomputed on submit, so a stale message would otherwise
  // keep contradicting a value the user has already corrected.
  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const withClear =
    (field: string, set: (v: string) => void) => (value: string) => {
      set(value);
      clearError(field);
    };

  // Medications — pre-populated from all past sessions
  const [selectedMeds, setSelectedMeds] = useState<MedEntry[]>(() =>
    collectPatientMeds(sessions),
  );
  const [medSearch, setMedSearch] = useState("");
  const [medResults, setMedResults] = useState<Medication[]>([]);

  // ---- Medication handlers ----

  const searchMeds = async (query: string) => {
    setMedSearch(query);
    if (query.length < 2) {
      setMedResults([]);
      return;
    }
    const results = await searchMedications(query);
    setMedResults(
      results.filter(
        (m) => !selectedMeds.some((sm) => sm.medication.id === m.id),
      ),
    );
  };

  const addMed = (med: Medication) => {
    setSelectedMeds([
      ...selectedMeds,
      {
        medication: med,
        dosage: med.dosage || "",
        frequency: "",
        duration: "",
        notes: "",
        active: true,
      },
    ]);
    setMedSearch("");
    setMedResults([]);
  };

  const addNewMed = async (dosage: string, form: string) => {
    if (!medSearch) return;
    try {
      const med = await createMedication({
        name: medSearch,
        dosage: dosage || undefined,
        form: form || undefined,
      });
      addMed(med);
    } catch {
      toast.error(t("createMedFailed"));
    }
  };

  const removeMed = (index: number) => {
    setSelectedMeds(selectedMeds.filter((_, i) => i !== index));
  };

  const updateMed = (
    index: number,
    field: keyof Omit<MedEntry, "medication">,
    value: string | boolean,
  ) => {
    const updated = [...selectedMeds];
    const entry = { ...updated[index] };
    if (field === "active") {
      entry.active = value as boolean;
    } else {
      entry[field] = value as string;
    }
    updated[index] = entry;
    setSelectedMeds(updated);
  };

  // ---- Submit ----

  const handleSubmit = () => {
    // Validate session details
    const result = createSessionSchema.safeParse({
      date,
      bloodPressure: bp,
      pulse,
      temperature,
      respRate,
      examination,
    });
    const fieldErrors = getFieldErrors(result);
    setErrors(fieldErrors);
    if (!result.success) return;
    // Validate clinic selection
    if (!clinicId) {
      setErrors((prev) => ({ ...prev, clinicId: t("selectClinicError") }));
      return;
    }

    startTransition(async () => {
      try {
        const created = await createSession(patientId, {
          date: format(date!, "yyyy-MM-dd"),
          clinicId,
          appointmentId,
          examination: examination || undefined,
          bloodPressure: bp || undefined,
          pulse: pulse || undefined,
          temperature: temperature || undefined,
          respRate: respRate || undefined,
          medications: selectedMeds.map((sm) => ({
            medicationId: sm.medication.id,
            active: sm.active,
            dosage: sm.dosage || undefined,
            frequency: sm.frequency || undefined,
            duration: sm.duration || undefined,
            notes: sm.notes || undefined,
          })),
        });

        toast.success(t("created"));
        // Offer to print the prescription now, but only when there is something
        // to print. With no active meds, close straight to the list.
        if (hasActiveMeds(created)) {
          setCreatedSession(created);
        } else {
          onCancel();
        }
      } catch {
        toast.error(t("createFailed"));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
          {t("backToSessions")}
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || !date}>
          {isPending ? t("creating") : t("createSession")}
        </Button>
      </div>

      {/* The assistant's pre-assessment for this visit, read-only. The doctor's
          own vitals below start empty — the two are never merged. */}
      {currentPreAssessment && <PreAssessmentView pre={currentPreAssessment} />}

      {/* Clinic selector — only shown when no past appointment */}
      {!lastClinicId && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">
            {t("clinic")} *
          </label>
          <Select value={clinicId} onValueChange={withClear("clinicId", setClinicId)}>
            <SelectTrigger
              className={`w-64 ${errors.clinicId ? "border-destructive" : ""}`}
            >
              <SelectValue placeholder={t("selectClinic")} />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clinicId && (
            <p className="text-sm text-destructive">{errors.clinicId}</p>
          )}
        </div>
      )}

      <SessionDetailsCard
        date={date}
        setDate={(d) => {
          setDate(d);
          clearError("date");
        }}
        bp={bp}
        setBp={withClear("bloodPressure", setBp)}
        pulse={pulse}
        setPulse={withClear("pulse", setPulse)}
        temperature={temperature}
        setTemperature={withClear("temperature", setTemperature)}
        respRate={respRate}
        setRespRate={withClear("respRate", setRespRate)}
        examination={examination}
        setExamination={setExamination}
        errors={errors}
      />

      <MedicationsCard
        selectedMeds={selectedMeds}
        medSearch={medSearch}
        medResults={medResults}
        onSearch={searchMeds}
        onAddMed={addMed}
        onAddNewMed={addNewMed}
        onRemoveMed={removeMed}
        onUpdateMed={updateMed}
      />

      {/* Lab results reception entered ahead of this visit, read-only */}
      <SessionLabResults sheets={labSheets} />

      {/* Bottom submit */}
      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || !date}>
          {isPending ? t("creating") : t("createSession")}
        </Button>
      </div>

      {/* After saving, offer to print the prescription. Closing by any means
          (print, not now, or Esc) returns to the sessions list. */}
      <AlertDialog
        open={!!createdSession}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedSession(null);
            onCancel();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("printPromptTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("printPromptBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("printNotNow")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (createdSession)
                  printPrescription(createdSession, patientName);
              }}
            >
              <Printer className="h-4 w-4 me-2" />
              {t("printNow")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
