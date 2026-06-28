"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Appointment, Clinic } from "@prisma/client";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogTrigger as DialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, Building2 } from "lucide-react";
import { getPatientHistory } from "@/actions/patients";

type AppointmentWithClinic = Appointment & { clinic: Clinic };

interface PatientHistoryDialogProps {
  patientId: string;
  patientName: string;
}

export function PatientHistoryDialog({
  patientId,
  patientName,
}: PatientHistoryDialogProps) {
  const t = useTranslations("patientHistory");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("queueStatus");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentWithClinic[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      startTransition(async () => {
        const history = await getPatientHistory(patientId);
        setAppointments(history as AppointmentWithClinic[]);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title={t("viewHistory")}>
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { name: patientName })}</DialogTitle>
        </DialogHeader>

        {isPending ? (
          <div className="py-8 text-center text-muted-foreground">
            {tCommon("loading")}
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("noPrevious")}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3" />
                    {format.dateTime(new Date(apt.date), {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {apt.clinic.name}
                  </div>
                  {apt.notes && (
                    <p className="text-xs text-muted-foreground">{apt.notes}</p>
                  )}
                </div>
                <Badge variant="outline">
                  {tStatus.has(apt.status)
                    ? tStatus(apt.status)
                    : apt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
