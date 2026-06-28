import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BPInput } from "@/components/ui/bp-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface SessionDetailsCardProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  bp: string;
  setBp: (v: string) => void;
  pulse: string;
  setPulse: (v: string) => void;
  temperature: string;
  setTemperature: (v: string) => void;
  respRate: string;
  setRespRate: (v: string) => void;
  examination: string;
  setExamination: (v: string) => void;
  errors?: Record<string, string>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function SessionDetailsCard({
  date,
  setDate,
  bp,
  setBp,
  pulse,
  setPulse,
  temperature,
  setTemperature,
  respRate,
  setRespRate,
  examination,
  setExamination,
  errors = {},
}: SessionDetailsCardProps) {
  const t = useTranslations("session");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("details")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t("date")} *</label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={date ? format(date, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const d = e.target.value ? new Date(e.target.value) : undefined;
                if (d && !isNaN(d.getTime())) setDate(d);
              }}
              className={`flex-1 ${errors.date ? "border-destructive" : ""}`}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={new Date().getFullYear()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <FieldError message={errors.date} />
        </div>

        {/* Vitals */}
        <div>
          <label className="text-sm font-medium">{t("vitals")}</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1.5">
            <BPInput value={bp} onChange={setBp} error={errors.bloodPressure} />
            <div>
              <Input
                placeholder={t("pulse")}
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                className={errors.pulse ? "border-destructive" : ""}
              />
              <FieldError message={errors.pulse} />
            </div>
            <div>
              <Input
                placeholder={t("tempC")}
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className={errors.temperature ? "border-destructive" : ""}
              />
              <FieldError message={errors.temperature} />
            </div>
            <div>
              <Input
                placeholder={t("respRate")}
                value={respRate}
                onChange={(e) => setRespRate(e.target.value)}
                className={errors.respRate ? "border-destructive" : ""}
              />
              <FieldError message={errors.respRate} />
            </div>
          </div>
        </div>

        {/* Examination */}
        <div>
          <label className="text-sm font-medium">{t("examination")}</label>
          <Textarea
            placeholder={t("examinationPlaceholder")}
            value={examination}
            onChange={(e) => setExamination(e.target.value)}
            rows={3}
            className="mt-1.5"
          />
        </div>
      </CardContent>
    </Card>
  );
}
