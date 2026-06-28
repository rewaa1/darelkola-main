"use client";

import { Appointment, Clinic } from "@prisma/client";
import { useTranslations, useFormatter } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2 } from "lucide-react";

interface AppointmentsTabProps {
  appointments: (Appointment & { clinic: Clinic })[];
}

export function AppointmentsTab({ appointments }: AppointmentsTabProps) {
  const t = useTranslations("patientTabs.appointmentsTab");
  const tStatus = useTranslations("status");
  const format = useFormatter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t("none")}</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format.dateTime(new Date(apt.date), {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
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
                  {tStatus.has(apt.status) ? tStatus(apt.status) : apt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
