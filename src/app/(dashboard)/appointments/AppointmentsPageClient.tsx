"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { getPaginatedAppointments } from "@/actions/appointments";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { DataTable } from "@/components/ui/data-table";
import {
  AppointmentFilters,
  AppointmentCard,
  useAppointmentColumns,
  type AppointmentRow,
} from "@/components/appointments";

interface AppointmentsPageClientProps {
  clinics: { id: string; name: string }[];
}

export function AppointmentsPageClient({
  clinics,
}: AppointmentsPageClientProps) {
  const t = useTranslations("appointments");
  const appointmentColumns = useAppointmentColumns();
  // Filters
  const [clinicFilter, setClinicFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filters = useMemo(
    () => ({
      clinicId: clinicFilter !== "all" ? clinicFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      startDate: dateFilter || undefined,
      endDate: dateFilter || undefined,
      search: debouncedSearch || undefined,
    }),
    [clinicFilter, statusFilter, dateFilter, debouncedSearch],
  );

  // Mobile: infinite scroll
  const {
    items: mobileAppointments,
    isLoading: mobileLoading,
    hasMore,
    sentinelRef,
    totalCount: mobileTotalCount,
  } = useInfiniteScroll<
    AppointmentRow,
    {
      clinicId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  >({
    fetcher: getPaginatedAppointments,
    pageSize: DEFAULT_PAGE_SIZE,
    filters,
  });

  // Desktop: server-side pagination
  const [desktopPage, setDesktopPage] = useState(1);
  const [desktopPageSize, setDesktopPageSize] = useState(15);
  const [desktopData, setDesktopData] = useState<AppointmentRow[]>([]);
  const [desktopTotal, setDesktopTotal] = useState(0);
  const [desktopLoading, setDesktopLoading] = useState(false);

  const fetchDesktopPage = useCallback(
    async (p: number, ps: number, f: typeof filters) => {
      setDesktopLoading(true);
      try {
        const result = await getPaginatedAppointments({
          page: p,
          pageSize: ps,
          ...f,
        });
        setDesktopData(result.data as AppointmentRow[]);
        setDesktopTotal(result.totalCount);
      } finally {
        setDesktopLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchDesktopPage(desktopPage, desktopPageSize, filters);
  }, [desktopPage, desktopPageSize, filters, fetchDesktopPage]);

  useEffect(() => {
    setDesktopPage(1);
  }, [filters]);

  const isLoading = mobileLoading || desktopLoading;
  const totalForStats = desktopTotal || mobileTotalCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Filters */}
      <AppointmentFilters
        clinics={clinics}
        clinicFilter={clinicFilter}
        onClinicFilterChange={setClinicFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoading}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{totalForStats}</div>
            <div className="text-xs text-muted-foreground">{t("total")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Infinite scroll list */}
      <div className="space-y-2 md:hidden">
        {mobileAppointments.map((apt) => (
          <AppointmentCard key={apt.id} appointment={apt} />
        ))}

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {mobileAppointments.length === 0 && !mobileLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">{t("noneFound")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: DataTable */}
      <div className="hidden md:block">
        <DataTable
          columns={appointmentColumns}
          data={desktopData}
          totalCount={desktopTotal}
          page={desktopPage}
          pageSize={desktopPageSize}
          onPageChange={setDesktopPage}
          onPageSizeChange={(size) => {
            setDesktopPageSize(size);
            setDesktopPage(1);
          }}
        />
      </div>
    </div>
  );
}
