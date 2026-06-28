import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/actions/dashboard";
import { redirect } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  Stethoscope,
  UserPlus,
  TrendingUp,
  Building2,
  Clock,
} from "lucide-react";
import { DashboardChart } from "./DashboardChart";

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
  CHECKED_IN: "bg-amber-100 text-amber-700 border-amber-200",
  WITH_DOCTOR: "bg-purple-100 text-purple-700 border-purple-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
  NO_SHOW: "bg-red-100 text-red-700 border-red-200",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("dashboard");
  const tStatus = await getTranslations("status");
  const format = await getFormatter();

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const data = await getDashboardData();

  const allStatuses = [
    "SCHEDULED",
    "CHECKED_IN",
    "WITH_DOCTOR",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("welcome", { name: user.name?.split(" ")[0] ?? "" })}
          </h1>
          <p className="text-muted-foreground">
            {format.dateTime(now, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalPatients")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPatients}</div>
            <p className="text-xs text-muted-foreground">{t("allRegistered")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("todayAppointments")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {t("scheduledToday")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("todaySessions")}
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todaySessions}</div>
            <p className="text-xs text-muted-foreground">
              {t("consultationsToday")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("newThisMonth")}
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.newPatientsThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("patientsSince", {
                date: format.dateTime(firstOfMonth, {
                  month: "short",
                  day: "numeric",
                }),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Status Breakdown Row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* 7-Day Trend */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("last7Days")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <DashboardChart data={data.chartData} />
          </CardContent>
        </Card>

        {/* Today's Status Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("todayStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.todayAppointments === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noAppointmentsToday")}
              </p>
            ) : (
              <div className="space-y-3">
                {allStatuses.map((status) => {
                  const count = data.statusBreakdown[status] || 0;
                  if (count === 0) return null;
                  const pct = Math.round(
                    (count / data.todayAppointments) * 100,
                  );
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{tStatus(status)}</span>
                        <span className="font-medium">
                          {count}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${statusColors[status]?.split(" ")[0] || "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments + Clinic Breakdown Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                {t("recentAppointments")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noAppointmentsYet")}
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {apt.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apt.clinic.name} •{" "}
                        {format.dateTime(new Date(apt.date), {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${statusColors[apt.status] || ""}`}
                    >
                      {tStatus.has(apt.status) ? tStatus(apt.status) : apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clinic Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("clinicsToday")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.clinicStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noClinicActivity")}
              </p>
            ) : (
              <div className="space-y-3">
                {data.clinicStats
                  .sort((a, b) => b.count - a.count)
                  .map((clinic) => (
                    <div
                      key={clinic.name}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span className="text-sm">{clinic.name}</span>
                      <span className="text-sm font-bold">{clinic.count}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
