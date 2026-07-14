"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { AppointmentType } from "@prisma/client";
import { format } from "date-fns";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogTrigger as DialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Pencil, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { clinicDayLocal } from "@/lib/clinic-day";
import { updateAppointment } from "@/actions/appointments";
import { useActionErrors } from "@/lib/use-action-errors";
import { appointmentTypes, type AppointmentRow } from "./appointment-types";

interface EditAppointmentDialogProps {
  appointment: AppointmentRow;
  clinics: { id: string; name: string }[];
  onUpdated?: () => void;
}

export function EditAppointmentDialog({
  appointment,
  clinics,
  onUpdated,
}: EditAppointmentDialogProps) {
  const t = useTranslations("booking");
  const tAppt = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const tType = useTranslations("appointmentType");
  const tToast = useTranslations("appointmentsToast");
  const formatter = useFormatter();
  const { failed, showError } = useActionErrors();

  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState<Date>(new Date(appointment.date));
  const [dateOpen, setDateOpen] = useState(false);
  const [type, setType] = useState<AppointmentType>(appointment.type);
  const [clinicId, setClinicId] = useState(appointment.clinicId);
  const [notes, setNotes] = useState(appointment.notes ?? "");

  // Reopening after a cancelled edit should show the saved values, not the
  // half-edited ones left behind.
  const resetToAppointment = () => {
    setDate(new Date(appointment.date));
    setType(appointment.type);
    setClinicId(appointment.clinicId);
    setNotes(appointment.notes ?? "");
  };

  const handleOpenChange = (next: boolean) => {
    if (next) resetToAppointment();
    setOpen(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateAppointment(appointment.id, {
        date: format(date, "yyyy-MM-dd"),
        type,
        notes,
        clinicId,
      });
      if (failed(res)) return;
      toast.success(tToast("updated"));
      setOpen(false);
      onUpdated?.();
    } catch {
      showError();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label={tAppt("edit")}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tAppt("editTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient is fixed on an existing booking — shown for context only. */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {appointment.patientName}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Phone className="h-3 w-3" />
              {appointment.patientPhone}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("clinic")}</label>
            <Select value={clinicId} onValueChange={setClinicId}>
              <SelectTrigger className="w-full">
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
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("type")}</label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AppointmentType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectType")} />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {tType(ty)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("date")}</label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full ps-3 text-start font-normal"
                >
                  {formatter.dateTime(date, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) setDate(d);
                    setDateOpen(false);
                  }}
                  // Past is the day already in progress; can't move earlier.
                  disabled={(d) => d < clinicDayLocal()}
                  captionLayout="dropdown"
                  fromYear={clinicDayLocal().getFullYear()}
                  toYear={clinicDayLocal().getFullYear() + 1}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("notesOptional")}</label>
            <Textarea
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className={cn(isSaving && "pointer-events-none opacity-50")}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
