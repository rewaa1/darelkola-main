"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Medication, SessionMedication, Session } from "@prisma/client";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { updateSessionMedication } from "@/actions/sessions";

type SessionMedWithMed = SessionMedication & { medication: Medication };

type SessionWithMeds = Session & {
  sessionMedications: SessionMedWithMed[];
};

// Build a full picture of each medication across sessions
interface MedSummary {
  medication: Medication;
  // Latest session data (for editing)
  latestSessionMed: SessionMedWithMed;
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
  // First and last active dates
  firstActiveDate: Date | null;
  lastActiveDate: Date | null;
  currentlyActive: boolean;
}

function buildMedSummaries(sessions: SessionWithMeds[]): MedSummary[] {
  const medsMap = new Map<string, MedSummary>();

  // Sessions are sorted desc (newest first)
  sessions.forEach((session) => {
    session.sessionMedications.forEach((sm) => {
      if (!medsMap.has(sm.medicationId)) {
        medsMap.set(sm.medicationId, {
          medication: sm.medication,
          latestSessionMed: sm,
          latestSessionDate: session.date,
          history: [],
          firstActiveDate: null,
          lastActiveDate: null,
          currentlyActive: sm.active,
        });
      }

      const summary = medsMap.get(sm.medicationId)!;
      summary.history.push({
        sessionDate: session.date,
        active: sm.active,
        dosage: sm.dosage,
        frequency: sm.frequency,
        duration: sm.duration,
        notes: sm.notes,
      });

      // Track first/last active dates (sessions sorted desc, so last processed is oldest)
      if (sm.active) {
        if (!summary.lastActiveDate) {
          summary.lastActiveDate = session.date;
        }
        summary.firstActiveDate = session.date; // keeps updating to the oldest
      }
    });
  });

  return Array.from(medsMap.values());
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

  // Local edit state
  const [active, setActive] = useState(sm.active);
  const [dosage, setDosage] = useState(sm.dosage || "");
  const [frequency, setFrequency] = useState(sm.frequency || "");
  const [duration, setDuration] = useState(sm.duration || "");
  const [notes, setNotes] = useState(sm.notes || "");

  const hasChanges =
    active !== sm.active ||
    dosage !== (sm.dosage || "") ||
    frequency !== (sm.frequency || "") ||
    duration !== (sm.duration || "") ||
    notes !== (sm.notes || "");

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateSessionMedication(sm.id, {
          active,
          dosage: dosage || undefined,
          frequency: frequency || undefined,
          duration: duration || undefined,
          notes: notes || undefined,
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
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
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
          {/* First/Last active badge */}
          {summary.firstActiveDate && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t("since", {
                date: format.dateTime(new Date(summary.firstActiveDate), {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }),
              })}
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
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Switch checked={active} onCheckedChange={setActive} />
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
  sessions: SessionWithMeds[];
}

export function MedicationsTab({ sessions }: MedicationsTabProps) {
  const t = useTranslations("patientTabs.medsTab");
  const summaries = buildMedSummaries(sessions);
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
