"use client";

import { useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Trash2, Loader2, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { deleteAppointment } from "@/actions/appointments";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { AppointmentRow, statusColors, typeColors } from "./appointment-types";

function DeleteButton({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("appointments");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        startTransition(async () => {
          try {
            await deleteAppointment(appointmentId);
            toast.success(t("deleted"));
            window.location.reload();
          } catch {
            toast.error(t("deleteFailed"));
          }
        });
      }}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

/** Hook returning translated, locale-aware table columns for appointments. */
export function useAppointmentColumns(): ColumnDef<AppointmentRow>[] {
  const t = useTranslations("appointments.columns");
  const tStatus = useTranslations("status");
  const tType = useTranslations("appointmentType");
  const format = useFormatter();

  return [
    {
      id: "patientName",
      accessorKey: "patientName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ms-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("patient")}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original.patientId ? (
            <Link
              href={`/patients/${row.original.patientId}`}
              className="font-medium text-sm hover:underline"
            >
              {row.original.patientName}
            </Link>
          ) : (
            <span className="font-medium text-sm">
              {row.original.patientName}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Phone className="h-3 w-3" />
          {row.original.patientPhone}
        </span>
      </div>
    ),
  },
    {
      id: "clinic",
      accessorFn: (row) => row.clinic.name,
      header: () => t("clinic"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.clinic.name}</span>
      ),
    },
    {
      id: "date",
      accessorFn: (row) => new Date(row.date).getTime(),
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ms-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("date")}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {format.dateTime(new Date(row.original.date), {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "type",
      accessorKey: "type",
      header: () => t("type"),
      cell: ({ row }) => {
        const aptType = row.original.type ?? "REGULAR_EXAMINATION";
        return (
          <Badge
            variant="outline"
            className={`text-xs ${typeColors[aptType]}`}
          >
            {tType(aptType)}
          </Badge>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: () => t("status"),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`text-xs ${statusColors[row.original.status]}`}
        >
          {tStatus(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <DeleteButton appointmentId={row.original.id} />,
    },
  ];
}
