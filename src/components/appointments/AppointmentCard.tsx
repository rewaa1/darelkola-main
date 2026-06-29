import { Badge } from "@/components/ui/badge";
import { User, Phone } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import Link from "next/link";
import { AppointmentRow, statusColors, typeColors } from "./appointment-types";

interface AppointmentCardProps {
  appointment: AppointmentRow;
}

export function AppointmentCard({ appointment: apt }: AppointmentCardProps) {
  const tStatus = useTranslations("status");
  const tType = useTranslations("appointmentType");
  const format = useFormatter();
  const aptType = apt.type ?? "REGULAR_EXAMINATION";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {apt.patientId ? (
              <Link
                href={`/patients/${apt.patientId}`}
                className="font-medium text-sm hover:underline"
              >
                {apt.patientName}
              </Link>
            ) : (
              <span className="font-medium text-sm">{apt.patientName}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {apt.patientPhone}
            </span>
            <span>{apt.clinic.name}</span>
            {apt.queueNumber && <span>#{apt.queueNumber}</span>}
          </div>
          <Badge
            variant="outline"
            className={`mt-1.5 text-[10px] ${typeColors[aptType]}`}
          >
            {tType(aptType)}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground">
          {format.dateTime(new Date(apt.date), {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        <Badge
          variant="outline"
          className={`text-xs ${statusColors[apt.status]}`}
        >
          {tStatus(apt.status)}
        </Badge>
      </div>
    </div>
  );
}
