"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BPInput } from "@/components/ui/bp-input";
import { Save } from "lucide-react";
import {
  upsertPreAssessment,
  getPreAssessmentForAppointment,
} from "@/actions/pre-assessments";
import { useActionErrors } from "@/lib/use-action-errors";

type Initial = Awaited<ReturnType<typeof getPreAssessmentForAppointment>>;

interface Props {
  appointmentId: string;
  initial: Initial;
  onSaved: () => void;
}

export function PreAssessmentForm({ appointmentId, initial, onSaved }: Props) {
  const t = useTranslations("assistant");
  const tSession = useTranslations("session");
  const { failed, showError } = useActionErrors();
  const [isPending, startTransition] = useTransition();

  const [bp, setBp] = useState(initial?.bloodPressure ?? "");
  const [pulse, setPulse] = useState(initial?.pulse ?? "");
  const [temperature, setTemperature] = useState(initial?.temperature ?? "");
  const [respRate, setRespRate] = useState(initial?.respRate ?? "");
  const [examination, setExamination] = useState(initial?.examination ?? "");

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await upsertPreAssessment(appointmentId, {
          bloodPressure: bp,
          pulse,
          temperature,
          respRate,
          examination,
        });
        if (failed(res)) return;
        toast.success(t("saved"));
        onSaved();
      } catch {
        showError();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("assessment")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">{t("vitals")}</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1.5">
            <BPInput value={bp} onChange={setBp} />
            <Input
              placeholder={tSession("pulse")}
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
            />
            <Input
              placeholder={tSession("tempC")}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
            <Input
              placeholder={tSession("respRate")}
              value={respRate}
              onChange={(e) => setRespRate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">{t("examination")}</label>
          <Textarea
            placeholder={t("examinationPlaceholder")}
            value={examination}
            onChange={(e) => setExamination(e.target.value)}
            rows={5}
            className="mt-1.5"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="h-4 w-4 me-2" />
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
