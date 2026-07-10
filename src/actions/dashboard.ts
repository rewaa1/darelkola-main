"use server";

import { prisma } from "@/lib/prisma";
import { clinicDay } from "@/lib/clinic-day";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function getDashboardData() {
  const now = new Date();

  // The working day, not the calendar day — at 3 AM the shift is still running
  // and these counters must still describe it. `date` is @db.Date, so an exact
  // match on UTC midnight selects the whole day.
  const today = clinicDay(now);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build 7 day date range. UTC arithmetic: these are date markers, not moments.
  const sevenDaysAgo = new Date(today.getTime() - 6 * MS_PER_DAY);

  const [
    totalPatients,
    todayAppointments,
    todaySessions,
    newPatientsThisMonth,
    todayAppointmentsList,
    recentAppointments,
    last7DaysRaw,
    clinicBreakdown,
  ] = await Promise.all([
    // Total patients
    prisma.patient.count(),

    // Today's appointment count
    prisma.appointment.count({
      where: { date: today },
    }),

    // Today's sessions count
    prisma.session.count({
      where: { date: today },
    }),

    // New patients this month
    prisma.patient.count({
      where: { createdAt: { gte: monthStart } },
    }),

    // Today's appointments by status
    prisma.appointment.groupBy({
      by: ["status"],
      where: { date: today },
      _count: true,
    }),

    // Recent appointments (last 5)
    prisma.appointment.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: {
        clinic: { select: { name: true } },
      },
    }),

    // Last 7 days appointments
    prisma.appointment.findMany({
      where: { date: { gte: sevenDaysAgo, lte: today } },
      select: { date: true },
    }),

    // Clinic breakdown (today)
    prisma.appointment.groupBy({
      by: ["clinicId"],
      where: { date: today },
      _count: true,
    }),
  ]);

  // Process 7-day chart data
  const dayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const key = new Date(today.getTime() - i * MS_PER_DAY)
      .toISOString()
      .split("T")[0];
    dayMap.set(key, 0);
  }
  for (const apt of last7DaysRaw) {
    const key = new Date(apt.date).toISOString().split("T")[0];
    dayMap.set(key, (dayMap.get(key) || 0) + 1);
  }
  const chartData = Array.from(dayMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Today's status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const row of todayAppointmentsList) {
    statusBreakdown[row.status] = row._count;
  }

  // Resolve clinic names for breakdown
  const clinicIds = clinicBreakdown.map((c) => c.clinicId);
  const clinics =
    clinicIds.length > 0
      ? await prisma.clinic.findMany({
          where: { id: { in: clinicIds } },
          select: { id: true, name: true },
        })
      : [];
  const clinicNameMap = new Map(clinics.map((c) => [c.id, c.name]));
  const clinicStats = clinicBreakdown.map((c) => ({
    name: clinicNameMap.get(c.clinicId) || "Unknown",
    count: c._count,
  }));

  return {
    totalPatients,
    todayAppointments,
    todaySessions,
    newPatientsThisMonth,
    statusBreakdown,
    chartData,
    recentAppointments,
    clinicStats,
  };
}
