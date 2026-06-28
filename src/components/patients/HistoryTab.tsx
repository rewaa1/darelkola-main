"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PersonalHistory, PreviousMedication } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateMedicalHistory,
  addPreviousMedication,
  deletePreviousMedication,
} from "@/actions/patients";
import { previousMedicationSchema, getFieldErrors } from "@/lib/validation";

interface HistoryTabProps {
  patientId: string;
  history: PersonalHistory | null;
  previousMedications: PreviousMedication[];
}

export function HistoryTab({
  patientId,
  history,
  previousMedications,
}: HistoryTabProps) {
  const t = useTranslations("patientTabs.history");
  const tCommon = useTranslations("common");
  const tMed = useTranslations("medications");
  const [isPending, startTransition] = useTransition();
  const [present, setPresent] = useState(history?.presentHistory || "");
  const [past, setPast] = useState(history?.pastHistory || "");
  const [family, setFamily] = useState(history?.familyHistory || "");

  // Previous medications form
  const [drug, setDrug] = useState("");
  const [frequency, setFrequency] = useState("");

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateMedicalHistory(patientId, {
          presentHistory: present,
          pastHistory: past,
          familyHistory: family,
        });
        toast.success(t("saved"));
      } catch {
        toast.error(t("saveFailed"));
      }
    });
  };

  const [medErrors, setMedErrors] = useState<Record<string, string>>({});

  const handleAddMed = () => {
    const result = previousMedicationSchema.safeParse({ drug, frequency });
    const fieldErrors = getFieldErrors(result);
    setMedErrors(fieldErrors);
    if (!result.success) return;
    startTransition(async () => {
      try {
        await addPreviousMedication(patientId, { drug, frequency });
        setDrug("");
        setFrequency("");
        toast.success(tMed("added"));
      } catch {
        toast.error(tMed("addFailed"));
      }
    });
  };

  const handleDeleteMed = (id: string) => {
    startTransition(async () => {
      try {
        await deletePreviousMedication(id);
        toast.success(tMed("removed"));
      } catch {
        toast.error(tMed("removeFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Medical History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {tCommon("save")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {t("presentHistory")}
            </label>
            <Textarea
              value={present}
              onChange={(e) => setPresent(e.target.value)}
              placeholder={t("presentPlaceholder")}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("pastHistory")}</label>
            <Textarea
              value={past}
              onChange={(e) => setPast(e.target.value)}
              placeholder={t("pastPlaceholder")}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("familyHistory")}</label>
            <Textarea
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder={t("familyPlaceholder")}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Previous Medications */}
      <Card>
        <CardHeader>
          <CardTitle>{t("previousMedications")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder={t("drugName")}
              value={drug}
              onChange={(e) => setDrug(e.target.value)}
              className={`flex-1 ${medErrors.drug ? "border-destructive" : ""}`}
            />
            <Input
              placeholder={t("frequency")}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className={`w-32 ${medErrors.frequency ? "border-destructive" : ""}`}
            />
            <Button onClick={handleAddMed} disabled={isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {(medErrors.drug || medErrors.frequency) && (
            <p className="text-sm text-destructive -mt-2 mb-2">
              {medErrors.drug || medErrors.frequency}
            </p>
          )}

          {previousMedications.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {t("noPreviousMeds")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("drug")}</TableHead>
                  <TableHead>{t("frequency")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previousMedications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell>{med.drug}</TableCell>
                    <TableCell>{med.frequency}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMed(med.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
