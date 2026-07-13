"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Pill,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { updateSessionMedication } from "@/actions/sessions";
import type { PatientMedicationRow } from "@/actions/patients";
import { clinicDayString } from "@/lib/clinic-day";

// Build a full picture of each medication across sessions
interface MedSummary {
  medication: PatientMedicationRow["medication"];
  // Latest session data (for editing)
  latestSessionMed: PatientMedicationRow;
  latestSessionDate: Date;
  // History across all sessions
  history: {
    sessionDate: Date;
    active: boolean;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    notes: string | null;
  }[];
  // Effective course dates: the explicit started_at/stopped_at recorded on the
  // session rows when present, otherwise inferred from session dates so old
  // rows still show something sensible.
  startedAt: Date | null;
  stoppedAt: Date | null;
  currentlyActive: boolean;
}

// Working accumulator — carries the raw signals we need to derive the effective
// course dates once every session for a drug has been seen.
interface MedAcc {
  medication: PatientMedicationRow["medication"];
  latestSessionMed: PatientMedicationRow;
  latestSessionDate: Date;
  history: MedSummary["history"];
  currentlyActive: boolean;
  firstActiveDate: Date | null; // oldest session the drug was active in
  explicitStart: Date | null; // earliest explicit started_at
  explicitStop: Date | null; // most recent explicit stopped_at
}

function earliest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) < new Date(b) ? a : b;
}

// `meds` is the patient's full medication history, one row per drug per session,
// already sorted by session date descending (newest first).
function buildMedSummaries(meds: PatientMedicationRow[]): MedSummary[] {
  const medsMap = new Map<string, MedAcc>();

  meds.forEach((sm) => {
    const sessionDate = sm.session.date;
    if (!medsMap.has(sm.medicationId)) {
      medsMap.set(sm.medicationId, {
        medication: sm.medication,
        latestSessionMed: sm,
        latestSessionDate: sessionDate,
        history: [],
        currentlyActive: sm.active,
        firstActiveDate: null,
        explicitStart: null,
        explicitStop: null,
      });
    }

    const acc = medsMap.get(sm.medicationId)!;
    acc.history.push({
      sessionDate,
      active: sm.active,
      dosage: sm.dosage,
      frequency: sm.frequency,
      duration: sm.duration,
      notes: sm.notes,
    });

    // Oldest active session (rows sorted desc, so this keeps moving back).
    if (sm.active) acc.firstActiveDate = sessionDate;

    // Explicit course dates recorded on the row.
    acc.explicitStart = earliest(acc.explicitStart, sm.startedAt);
    // Rows are newest-first, so the first stop we see is the most recent.
    if (sm.stoppedAt && !acc.explicitStop) acc.explicitStop = sm.stoppedAt;
  });

  return Array.from(medsMap.values()).map((acc) => ({
    medication: acc.medication,
    latestSessionMed: acc.latestSessionMed,
    latestSessionDate: acc.latestSessionDate,
    history: acc.history,
    currentlyActive: acc.currentlyActive,
    startedAt: acc.explicitStart ?? acc.firstActiveDate,
    // Only stopped drugs carry a stop date; fall back to the newest session
    // (where the drug is recorded inactive) when none was captured explicitly.
    stoppedAt: acc.currentlyActive
      ? null
      : acc.explicitStop ?? acc.latestSessionDate,
  }));
}

// Format a Date as the "YYYY-MM-DD" value an <input type="date"> expects,
// using local date parts so the day never shifts under the timezone.
function toDateInput(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ==============================
// MedCard — expandable row for each medication
// ==============================

function MedCard({ summary }: { summary: MedSummary }) {
  const t = useTranslations("patientTabs.medsTab");
  const format = useFormatter();
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sm = summary.latestSessionMed;

  // Prefill the date inputs from the effective course dates, so what the doctor
  // edits matches what the header shows.
  const initialStart = toDateInput(summary.startedAt);
  const initialStop = summary.currentlyActive
    ? ""
    : toDateInput(summary.stoppedAt);

  // Local edit state
  const [active, setActive] = useState(sm.active);
  const [dosage, setDosage] = useState(sm.dosage || "");
  const [frequency, setFrequency] = useState(sm.frequency || "");
  const [duration, setDuration] = useState(sm.duration || "");
  const [notes, setNotes] = useState(sm.notes || "");
  const [startDate, setStartDate] = useState(initialStart);
  const [stopDate, setStopDate] = useState(initialStop);

  const fmtDate = (d: Date) =>
    format.dateTime(new Date(d), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // Toggling active off prefills today's stop date (editable); toggling back on
  // clears it. Mirrors the server's auto-capture so the UI stays in step.
  const handleActiveChange = (v: boolean) => {
    setActive(v);
    if (v) setStopDate("");
    else if (!stopDate) setStopDate(clinicDayString());
  };

  const hasChanges =
    active !== sm.active ||
    dosage !== (sm.dosage || "") ||
    frequency !== (sm.frequency || "") ||
    duration !== (sm.duration || "") ||
    notes !== (sm.notes || "") ||
    startDate !== initialStart ||
    stopDate !== initialStop;

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateSessionMedication(sm.id, {
          active,
          dosage: dosage || undefined,
          frequency: frequency || undefined,
          duration: duration || undefined,
          notes: notes || undefined,
          startedAt: startDate || null,
          // Active drugs never carry a stop date. When inactive, an empty field
          // is sent as undefined so the server auto-captures today.
          stoppedAt: active ? null : stopDate || undefined,
        });
        toast.success(t("updated", { name: summary.medication.name }));
      } catch {
        toast.error(t("updateFailed"));
      }
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-start"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Pill className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-sm">{summary.medication.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {[sm.dosage, sm.frequency, sm.duration]
                .filter(Boolean)
                .join(" • ") || t("noDetails")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Course dates: start, plus stop once the drug is discontinued */}
          {summary.startedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t("started", { date: fmtDate(summary.startedAt) })}
              {!summary.currentlyActive && summary.stoppedAt && (
                <span className="ms-1">
                  {t("stoppedOn", { date: fmtDate(summary.stoppedAt) })}
                </span>
              )}
            </span>
          )}
          <Badge
            className={
              summary.currentlyActive ? "bg-emerald-600 text-xs" : "text-xs"
            }
            variant={summary.currentlyActive ? "default" : "outline"}
          >
            {summary.currentlyActive ? t("active") : t("inactive")}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t p-4 space-y-4 bg-muted/10">
          {/* Edit Fields */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              {t("editLatestSession")}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium">{t("dosage")}</label>
                <Input
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder={t("dosagePlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">{t("frequency")}</label>
                <Input
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder={t("frequencyPlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">{t("duration")}</label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder={t("durationPlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">{t("notes")}</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Course dates */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-medium">{t("startDate")}</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {!active && (
                <div>
                  <label className="text-xs font-medium">{t("stopDate")}</label>
                  <Input
                    type="date"
                    value={stopDate}
                    onChange={(e) => setStopDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Switch checked={active} onCheckedChange={handleActiveChange} />
                <span className="text-sm">
                  {active ? t("active") : t("inactive")}
                </span>
              </div>
              {hasChanges && (
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin me-1" />
                  ) : (
                    <Save className="h-3 w-3 me-1" />
                  )}
                  {t("saveChanges")}
                </Button>
              )}
            </div>
          </div>

          {/* Session History Timeline */}
          {summary.history.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <History className="h-3 w-3" />
                {t("sessionHistory", { count: summary.history.length })}
              </h4>
              <div className="space-y-1">
                {summary.history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-1.5 px-2 rounded text-xs"
                  >
                    {/* Timeline dot */}
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        h.active ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="text-muted-foreground w-24 shrink-0">
                      {format.dateTime(new Date(h.sessionDate), {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <Badge
                      variant={h.active ? "default" : "outline"}
                      className={`text-[10px] px-1.5 py-0 ${
                        h.active ? "bg-emerald-600" : ""
                      }`}
                    >
                      {h.active ? t("active") : t("stopped")}
                    </Badge>
                    {h.dosage && (
                      <span className="text-muted-foreground">
                        {[h.dosage, h.frequency].filter(Boolean).join(" • ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==============================
// Main Tab
// ==============================

interface MedicationsTabProps {
  meds: PatientMedicationRow[];
}

export function MedicationsTab({ meds }: MedicationsTabProps) {
  const t = useTranslations("patientTabs.medsTab");
  const summaries = buildMedSummaries(meds);
  const activeMeds = summaries.filter((s) => s.currentlyActive);
  const inactiveMeds = summaries.filter((s) => !s.currentlyActive);

  return (
    <div className="space-y-4">
      {/* Active Medications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            <CardTitle>
              {t("activeMedications")}
              {activeMeds.length > 0 && (
                <span className="text-muted-foreground font-normal ms-1">
                  ({activeMeds.length})
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activeMeds.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              {t("noActive")}
            </p>
          ) : (
            <div className="space-y-2">
              {activeMeds.map((summary) => (
                <MedCard key={summary.medication.id} summary={summary} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Medications */}
      {inactiveMeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("inactiveMedications")}
              <span className="text-muted-foreground font-normal ms-1">
                ({inactiveMeds.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactiveMeds.map((summary) => (
                <MedCard key={summary.medication.id} summary={summary} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
