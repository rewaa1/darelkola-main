"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PersonalHistory } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateGeneralAppearance,
  updateGeneralExamination,
} from "@/actions/patients";
import { examinationSchema, getFieldErrors } from "@/lib/validation";
import { BPInput } from "@/components/ui/bp-input";

interface ExaminationTabProps {
  patientId: string;
  history: PersonalHistory | null;
}

export function ExaminationTab({ patientId, history }: ExaminationTabProps) {
  const t = useTranslations("patientTabs.examination");
  const tf = useTranslations("patientTabs.examination.fields");
  const ts = useTranslations("patientTabs.examination.sections");
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    // General Appearance
    built: history?.built || "",
    behavior: history?.behavior || "",
    intelligence: history?.intelligence || "",
    facies: history?.facies || "",
    decubitus: history?.decubitus || "",
    // Vitals
    bloodPressure: history?.bloodPressure || "",
    pulse: history?.pulse || "",
    supine: history?.supine || "",
    respRate: history?.respRate || "",
    temperature: history?.temperature || "",
    // Neck
    headAndNeck: history?.headAndNeck || "",
    lymphNodes: history?.lymphNodes || "",
    neckVeins: history?.neckVeins || "",
    thyroid: history?.thyroid || "",
    // Limbs
    upperLimb: history?.upperLimb || "",
    lowerLimb: history?.lowerLimb || "",
    peripheralPulse: history?.peripheralPulse || "",
    // Systems
    cardioExam: history?.cardioExam || "",
    chestExam: history?.chestExam || "",
    abdomenExam: history?.abdomenExam || "",
    neuroExam: history?.neuroExam || "",
    // Assessment
    provisionalDx: history?.provisionalDx || "",
    comments: history?.comments || "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    // Validate vitals
    const result = examinationSchema.safeParse({
      bloodPressure: formData.bloodPressure,
      pulse: formData.pulse,
      supine: formData.supine,
      respRate: formData.respRate,
      temperature: formData.temperature,
    });
    const fieldErrors = getFieldErrors(result);
    setErrors(fieldErrors);
    if (!result.success) return;
    startTransition(async () => {
      try {
        await updateGeneralAppearance(patientId, {
          built: formData.built,
          behavior: formData.behavior,
          intelligence: formData.intelligence,
          facies: formData.facies,
          decubitus: formData.decubitus,
        });
        await updateGeneralExamination(patientId, {
          bloodPressure: formData.bloodPressure,
          pulse: formData.pulse,
          supine: formData.supine,
          respRate: formData.respRate,
          temperature: formData.temperature,
          headAndNeck: formData.headAndNeck,
          lymphNodes: formData.lymphNodes,
          neckVeins: formData.neckVeins,
          thyroid: formData.thyroid,
          upperLimb: formData.upperLimb,
          lowerLimb: formData.lowerLimb,
          peripheralPulse: formData.peripheralPulse,
          cardioExam: formData.cardioExam,
          chestExam: formData.chestExam,
          abdomenExam: formData.abdomenExam,
          neuroExam: formData.neuroExam,
          provisionalDx: formData.provisionalDx,
          comments: formData.comments,
        });
        toast.success(t("saved"));
      } catch {
        toast.error(t("saveFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* General Appearance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {ts("generalAppearance")}
          </CardTitle>
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {t("saveAll")}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["built", "behavior", "intelligence", "facies", "decubitus"].map(
              (field) => (
                <div key={field}>
                  <label className="text-xs font-medium">{tf(field)}</label>
                  <Input
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => updateField(field, e.target.value)}
                    placeholder={tf(field)}
                  />
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vitals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ts("vitals")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium">
                {tf("bloodPressure")}
              </label>
              <BPInput
                value={formData.bloodPressure}
                onChange={(v) => updateField("bloodPressure", v)}
                error={errors.bloodPressure}
              />
            </div>
            {["pulse", "supine", "respRate", "temperature"].map((field) => (
              <div key={field}>
                <label className="text-xs font-medium">{tf(field)}</label>
                <Input
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className={errors[field] ? "border-destructive" : ""}
                />
                {errors[field] && (
                  <p className="text-sm text-destructive mt-1">
                    {errors[field]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Neck */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ts("headNeck")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["headAndNeck", "lymphNodes", "neckVeins", "thyroid"].map(
              (field) => (
                <div key={field}>
                  <label className="text-xs font-medium">{tf(field)}</label>
                  <Input
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => updateField(field, e.target.value)}
                  />
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Limbs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ts("limbs")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {["upperLimb", "lowerLimb", "peripheralPulse"].map((field) => (
              <div key={field}>
                <label className="text-xs font-medium">{tf(field)}</label>
                <Input
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => updateField(field, e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Systems */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ts("systems")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {["cardioExam", "chestExam", "abdomenExam", "neuroExam"].map(
            (field) => (
              <div key={field}>
                <label className="text-xs font-medium">{tf(field)}</label>
                <Textarea
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => updateField(field, e.target.value)}
                  rows={2}
                />
              </div>
            ),
          )}
        </CardContent>
      </Card>

      {/* Assessment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ts("assessment")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium">{tf("provisionalDx")}</label>
            <Textarea
              value={formData.provisionalDx}
              onChange={(e) => updateField("provisionalDx", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium">{tf("comments")}</label>
            <Textarea
              value={formData.comments}
              onChange={(e) => updateField("comments", e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
