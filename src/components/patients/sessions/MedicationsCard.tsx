import { useState } from "react";
import { Medication } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Pill } from "lucide-react";
import { MedEntry } from "./types";
import { MEDICATION_FORMS } from "./medication-forms";

interface MedicationsCardProps {
  selectedMeds: MedEntry[];
  medSearch: string;
  medResults: Medication[];
  onSearch: (query: string) => void;
  onAddMed: (med: Medication) => void;
  onAddNewMed: (dosage: string, form: string) => void;
  onRemoveMed: (index: number) => void;
  onUpdateMed: (
    index: number,
    field: keyof Omit<MedEntry, "medication">,
    value: string | boolean,
  ) => void;
}

export function MedicationsCard({
  selectedMeds,
  medSearch,
  medResults,
  onSearch,
  onAddMed,
  onAddNewMed,
  onRemoveMed,
  onUpdateMed,
}: MedicationsCardProps) {
  const t = useTranslations("session");
  const tForms = useTranslations("medForms");

  // Inline "create new medication" panel state
  const [creatingNew, setCreatingNew] = useState(false);
  const [newDosage, setNewDosage] = useState("");
  const [newForm, setNewForm] = useState("");

  const startCreate = () => {
    setNewDosage("");
    setNewForm("");
    setCreatingNew(true);
  };

  const confirmCreate = () => {
    onAddNewMed(newDosage.trim(), newForm);
    setCreatingNew(false);
    setNewDosage("");
    setNewForm("");
  };

  const cancelCreate = () => {
    setCreatingNew(false);
    setNewDosage("");
    setNewForm("");
    onSearch("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            <CardTitle>{t("medications")}</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {t("activeCount", {
              count: selectedMeds.filter((m) => m.active).length,
            })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search to add new */}
        <div className="relative">
          <Input
            placeholder={t("searchMedPlaceholder")}
            value={medSearch}
            onChange={(e) => onSearch(e.target.value)}
            disabled={creatingNew}
          />
          {!creatingNew &&
            (medResults.length > 0 || medSearch.length >= 2) && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                {medResults.map((med) => (
                  <button
                    key={med.id}
                    className="w-full text-start px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => onAddMed(med)}
                  >
                    {med.name}
                    {med.dosage && (
                      <span className="text-muted-foreground ms-1">
                        ({med.dosage})
                      </span>
                    )}
                  </button>
                ))}
                {medResults.length === 0 && medSearch.length >= 2 && (
                  <button
                    className="w-full text-start px-3 py-2 text-sm hover:bg-muted text-primary"
                    onClick={startCreate}
                  >
                    {t("createMed", { name: medSearch })}
                  </button>
                )}
              </div>
            )}
        </div>

        {/* Inline new-medication panel — captures dosage & form so they are
            saved on the medication itself, not just this session */}
        {creatingNew && (
          <div className="border border-dashed rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t("createMed", { name: medSearch })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t("dosage")}
                </label>
                <Input
                  placeholder={t("dosagePlaceholder")}
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t("form")}
                </label>
                <Select value={newForm} onValueChange={setNewForm}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t("selectForm")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICATION_FORMS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {tForms(f)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={confirmCreate}>
                {t("createAndAdd")}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelCreate}>
                {t("cancelCreate")}
              </Button>
            </div>
          </div>
        )}

        {/* Medication list */}
        {selectedMeds.length > 0 && (
          <div className="space-y-3">
            {selectedMeds.map((sm, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {sm.medication.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t("active")}
                    </span>
                    <Switch
                      checked={sm.active}
                      onCheckedChange={(v) => onUpdateMed(index, "active", v)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onRemoveMed(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input
                    placeholder={t("dosage")}
                    value={sm.dosage}
                    onChange={(e) =>
                      onUpdateMed(index, "dosage", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder={t("frequency")}
                    value={sm.frequency}
                    onChange={(e) =>
                      onUpdateMed(index, "frequency", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder={t("duration")}
                    value={sm.duration}
                    onChange={(e) =>
                      onUpdateMed(index, "duration", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder={t("notes")}
                    value={sm.notes}
                    onChange={(e) =>
                      onUpdateMed(index, "notes", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedMeds.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noMeds")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
