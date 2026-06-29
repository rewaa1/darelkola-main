"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Appointment, AppointmentStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, GripVertical, Check, X, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientHistoryDialog } from "./PatientHistoryDialog";
import { CheckInRegistrationDialog } from "./CheckInRegistrationDialog";
import { checkInWithPatient, checkInPatient } from "@/actions/appointments";
import { typeColors } from "@/components/appointments/appointment-types";
import { toast } from "sonner";

interface QueueCardProps {
  appointment: Appointment;
  isDragging?: boolean;
  onCheckIn?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onNoShow?: () => void;
  showDragHandle?: boolean;
}

const statusClassName: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-slate-100 text-slate-600 border-slate-200",
  CHECKED_IN: "bg-blue-100 text-blue-700 border-blue-200",
  WITH_DOCTOR: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-gray-100 text-gray-500 border-gray-200",
  NO_SHOW: "bg-red-100 text-red-600 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-400 border-gray-200",
};

export function QueueCard({
  appointment,
  isDragging,
  onCheckIn,
  onComplete,
  onCancel,
  onNoShow,
  showDragHandle = false,
}: QueueCardProps) {
  const t = useTranslations("queue");
  const tStatus = useTranslations("queueStatus");
  const tType = useTranslations("appointmentType");
  const tToast = useTranslations("appointmentsToast");
  const aptType = appointment.type ?? "REGULAR_EXAMINATION";
  const [showRegistration, setShowRegistration] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCheckInClick = async () => {
    if (!appointment.patientId) {
      setShowRegistration(true);
    } else {
      setIsCheckingIn(true);
      try {
        await checkInPatient(appointment.id);
        toast.success(tToast("checkedIn"));
        onCheckIn?.();
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setIsCheckingIn(false);
      }
    }
  };

  const handleRegistrationSuccess = async (patientId: string) => {
    setIsCheckingIn(true);
    try {
      await checkInWithPatient(appointment.id, patientId);
      toast.success(tToast("registeredCheckedIn"));
      onCheckIn?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "transition-all",
          isDragging && "shadow-lg ring-2 ring-primary scale-[1.02]",
        )}
      >
        <CardContent className="p-3 sm:p-4">
          {/* Top Row: Drag + Number + Name + Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {showDragHandle && (
              <div className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 touch-none">
                <GripVertical className="h-5 w-5" />
              </div>
            )}

            {appointment.queueNumber && (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {appointment.queueNumber}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm sm:text-base truncate">
                  {appointment.patientName}
                </span>
                {appointment.patientId && (
                  <PatientHistoryDialog
                    patientId={appointment.patientId}
                    patientName={appointment.patientName}
                  />
                )}
                {!appointment.patientId &&
                  appointment.status === "SCHEDULED" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-300 shrink-0"
                    >
                      {t("new")}
                    </Badge>
                  )}
              </div>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{appointment.patientPhone}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge
                variant="outline"
                className={cn("text-xs", statusClassName[appointment.status])}
              >
                {tStatus(appointment.status)}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[10px]", typeColors[aptType])}
              >
                {tType(aptType)}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 pt-2 border-t">
              {appointment.notes}
            </p>
          )}

          {/* Action Buttons — full-width row below on mobile */}
          {(appointment.status === "SCHEDULED" ||
            appointment.status === "CHECKED_IN" ||
            appointment.status === "WITH_DOCTOR") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              {/* Primary action */}
              {appointment.status === "SCHEDULED" && onCheckIn && (
                <Button
                  size="sm"
                  onClick={handleCheckInClick}
                  disabled={isCheckingIn}
                  className="flex-1 sm:flex-none"
                >
                  <UserCircle className="h-4 w-4 me-1.5" />
                  {isCheckingIn ? "..." : t("checkIn")}
                </Button>
              )}
              {appointment.status === "WITH_DOCTOR" && onComplete && (
                <Button
                  size="sm"
                  onClick={onComplete}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4 me-1.5" />
                  {t("complete")}
                </Button>
              )}

              {/* Secondary actions */}
              <div className="flex items-center gap-1 ms-auto">
                {(appointment.status === "SCHEDULED" ||
                  appointment.status === "CHECKED_IN") && (
                  <>
                    {onNoShow && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onNoShow}
                        className="text-xs px-2 sm:px-3"
                      >
                        {t("noShow")}
                      </Button>
                    )}
                    {onCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onCancel}
                        className="text-muted-foreground h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CheckInRegistrationDialog
        open={showRegistration}
        onOpenChange={setShowRegistration}
        prefillName={appointment.patientName}
        prefillPhone={appointment.patientPhone}
        onSuccess={handleRegistrationSuccess}
      />
    </>
  );
}
