"use client";

import {
  Patient,
  PersonalHistory,
  Appointment,
  Clinic,
  PreviousMedication,
  Investigation,
  Session,
  SessionMedication,
  Medication,
  InvestigationSheet,
  ExtraInvestigation,
} from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { differenceInYears } from "date-fns";
import { useTranslations } from "next-intl";

import { PersonalInfoTab } from "@/components/patients/PersonalInfoTab";
import { HistoryTab } from "@/components/patients/HistoryTab";
import { ExaminationTab } from "@/components/patients/ExaminationTab";
import { MedicationsTab } from "@/components/patients/MedicationsTab";
import { InvestigationsTab } from "@/components/patients/InvestigationsTab";
import { SessionsTab } from "@/components/patients/SessionsTab";
import { AppointmentsTab } from "@/components/patients/AppointmentsTab";

type SessionWithRelations = Session & {
  sessionMedications: (SessionMedication & { medication: Medication })[];
  investigationSheets: (InvestigationSheet & {
    extraInvestigations: ExtraInvestigation[];
  })[];
};

type PatientWithRelations = Patient & {
  personalHistory: PersonalHistory | null;
  previousMedications: PreviousMedication[];
  investigations: Investigation[];
  sessions: SessionWithRelations[];
  appointments: (Appointment & { clinic: Clinic })[];
};

interface PatientProfileProps {
  patient: PatientWithRelations;
  clinics: { id: string; name: string }[];
}

export function PatientProfile({ patient, clinics }: PatientProfileProps) {
  const t = useTranslations("patients");
  const tTabs = useTranslations("tabs");
  const tPatient = useTranslations("patient");
  const tSex = useTranslations("patient.sex");
  const history = patient.personalHistory;

  // Derive the last clinic from most recent appointment
  const sortedAppointments = [...patient.appointments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const lastClinicId = sortedAppointments[0]?.clinicId || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            {t("back")}
          </Link>
        </Button>
      </div>

      {/* Patient Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <User className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">
                {history?.fullName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {history?.phoneNumber}
                </span>
                {history?.dateOfBirth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {tPatient("years", {
                      count: differenceInYears(
                        new Date(),
                        new Date(history.dateOfBirth),
                      ),
                    })}
                  </span>
                )}
                {history?.sex && (
                  <Badge variant="outline">
                    {tSex.has(history.sex) ? tSex(history.sex) : history.sex}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="personal">{tTabs("personal")}</TabsTrigger>
          <TabsTrigger value="history">{tTabs("history")}</TabsTrigger>
          <TabsTrigger value="examination">{tTabs("examination")}</TabsTrigger>
          <TabsTrigger value="sessions">{tTabs("sessions")}</TabsTrigger>
          <TabsTrigger value="medications">{tTabs("medications")}</TabsTrigger>
          <TabsTrigger value="investigations">
            {tTabs("investigations")}
          </TabsTrigger>
          <TabsTrigger value="appointments">
            {tTabs("appointments")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab history={history} patientId={patient.id} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab
            patientId={patient.id}
            history={history}
            previousMedications={patient.previousMedications}
          />
        </TabsContent>

        <TabsContent value="examination">
          <ExaminationTab patientId={patient.id} history={history} />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab
            patientId={patient.id}
            patientName={patient.personalHistory?.fullName ?? ""}
            sessions={patient.sessions}
            lastClinicId={lastClinicId}
            clinics={clinics}
          />
        </TabsContent>

        <TabsContent value="medications">
          <MedicationsTab sessions={patient.sessions} />
        </TabsContent>

        <TabsContent value="investigations">
          <InvestigationsTab
            patientId={patient.id}
            investigations={patient.investigations}
          />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsTab appointments={patient.appointments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
